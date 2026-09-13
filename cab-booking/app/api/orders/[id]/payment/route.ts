import { NextResponse, after } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { notifyPaymentClaimed } from "@/lib/notify";
import { paymentClaimSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records the customer's CLAIM that they paid the advance.
 *
 * This is deliberately not a confirmation. Without a payment gateway there is
 * no callback to trust, so the order moves to PAYMENT_CLAIMED and waits for a
 * human to match the UTR against the bank statement in the admin panel. The
 * money is only real once you have seen it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = paymentClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "This booking was cancelled." }, { status: 409 });
  }
  if (order.paymentUtr) {
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  const updated = await updateOrder(id, {
    status: "PAYMENT_CLAIMED",
    paymentUtr: parsed.data.utr.toUpperCase(),
    paymentClaimedAt: new Date().toISOString(),
  });
  if (!updated) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  after(async () => {
    const results = await notifyPaymentClaimed(updated);
    const failed = results.filter((r) => !r.ok && r.error !== "disabled" && r.error !== "not configured");
    if (failed.length > 0) console.error("[notify] payment claimed", id, failed);
  });

  return NextResponse.json({ ok: true });
}
