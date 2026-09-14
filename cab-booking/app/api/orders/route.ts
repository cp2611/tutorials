import { NextResponse, after } from "next/server";
import { BookingError, createOrder } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";
import { QuoteError } from "@/lib/pricing";
import { createOrderSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { containsLinkSpam, filledTooFast, looksLikeFakePhone } from "@/lib/spam";
import { normalisePhone } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates the booking and alerts the owner — BEFORE any payment.
 *
 * If the customer never reaches the QR, the lead is still captured, still in
 * the admin panel, and still on the owner's phone within seconds. Recovering
 * those abandoned bookings by calling back is a large share of the revenue in
 * a lead-generation model, and gating the record behind payment throws it away.
 */
/** Deliberately generic: a bot should learn nothing about why it was refused. */
const REJECTED = { error: "We couldn't accept that booking. Please call us and we'll take it over the phone." };

export async function POST(req: Request) {
  const ip = clientIp(req);

  // Bookings are the expensive path — each one writes to the database and
  // fires a Telegram message and two emails. A competitor holding the submit
  // button should not be able to bury real leads or burn the email quota.
  const ipLimit = await rateLimit("order:ip", ip, 5, 60 * 60);
  if (!ipLimit.ok) {
    return NextResponse.json(REJECTED, {
      status: 429,
      headers: { "retry-after": String(ipLimit.retryAfterSeconds) },
    });
  }

  // A booking body is a few hundred bytes; anything large is not a customer.
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > 8_000) {
    return NextResponse.json(REJECTED, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Please check the form.", field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // No OTP, so these stand in for it: signals that cost a real customer
  // nothing and a script everything.
  if (filledTooFast(input.formLoadedAt)) return NextResponse.json(REJECTED, { status: 400 });
  if (containsLinkSpam(input.customerNotes)) return NextResponse.json(REJECTED, { status: 400 });

  const phone = normalisePhone(input.customerPhone);
  if (!phone || looksLikeFakePhone(phone)) {
    return NextResponse.json(
      { error: "Please enter the mobile number we should call you on.", field: "customerPhone" },
      { status: 400 },
    );
  }

  // One person booking six trips in a day is far more likely to be a script
  // than a customer, and this survives someone rotating their IP address.
  const phoneLimit = await rateLimit("order:phone", phone, 5, 24 * 60 * 60);
  if (!phoneLimit.ok) {
    return NextResponse.json(
      { error: "You already have several bookings with us today. Please call us for another." },
      { status: 429 },
    );
  }

  try {
    const order = await createOrder(input);

    // Alerts run after the response so a slow Telegram or email API never
    // makes the customer stare at a spinner — or worse, retry and double-book.
    after(async () => {
      const results = await notifyNewOrder(order);
      const failed = results.filter((r) => !r.ok && r.error !== "disabled" && r.error !== "not configured");
      if (failed.length > 0) console.error("[notify] new order", order.id, failed);
    });

    return NextResponse.json({
      id: order.id,
      advance: order.advanceAmount,
      payableAmount: order.payableAmount,
      total: order.totalAmount,
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    }
    if (e instanceof QuoteError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[orders] create failed", e);
    return NextResponse.json(
      { error: "Something went wrong. Please call us and we'll book it for you." },
      { status: 500 },
    );
  }
}
