import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isParseFailure, parseBankAlert } from "@/lib/bankAlert";
import { reconcileCredit } from "@/lib/reconcile";
import { notifyPaymentAutoConfirmed, notifyUnmatchedCredit } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives a bank credit alert and confirms the booking it belongs to.
 *
 * Point an SMS-forwarding app on an Android phone, or an inbound-email hook on
 * your bank's credit alerts, at this URL. The customer then types nothing at
 * all — they pay, and their booking page flips to confirmed on its own.
 *
 * SECURITY: this endpoint can mark a booking as paid, so it is the single most
 * sensitive route on the site. It requires a bearer secret that must be long
 * and random, and it accepts nothing without one. Anyone who can post here
 * unauthenticated can confirm bookings for free.
 */

function authorised(req: Request): boolean {
  const expected = process.env.BANK_WEBHOOK_SECRET;
  // Refuse outright when unconfigured, rather than defaulting to open.
  if (!expected || expected.length < 16) return false;

  const header = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const provided = header.startsWith("Bearer ")
    ? header.slice(7)
    : (req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret") ?? "");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accepts JSON {text}, form-encoded, or a raw text body — forwarders differ. */
async function readAlertText(req: Request): Promise<string> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    for (const key of ["text", "message", "body", "sms", "content", "snippet"]) {
      const v = body[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return "";
  }
  if (type.includes("form")) {
    const form = await req.formData();
    for (const key of ["text", "message", "body", "sms", "content"]) {
      const v = form.get(key);
      if (typeof v === "string" && v.trim()) return v;
    }
    return "";
  }
  return await req.text();
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let text: string;
  try {
    text = await readAlertText(req);
  } catch {
    return NextResponse.json({ error: "Unreadable body." }, { status: 400 });
  }
  if (!text.trim()) return NextResponse.json({ error: "Empty alert." }, { status: 400 });

  const parsed = parseBankAlert(text);
  if (isParseFailure(parsed)) {
    // Not an error: most SMS reaching a forwarder are OTPs and promotions.
    return NextResponse.json({ ok: true, ignored: parsed.reason });
  }

  const result = await reconcileCredit(parsed);

  after(async () => {
    if (result.outcome === "confirmed") {
      await notifyPaymentAutoConfirmed(result.order);
    } else if (result.outcome === "no-match" || result.outcome === "ambiguous") {
      await notifyUnmatchedCredit(
        parsed,
        result.outcome === "ambiguous" ? result.candidates.map((o) => o.id) : [],
      );
    }
  });

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    amount: parsed.amount,
    ...(result.outcome === "confirmed" || result.outcome === "duplicate"
      ? { bookingId: result.order.id }
      : {}),
  });
}
