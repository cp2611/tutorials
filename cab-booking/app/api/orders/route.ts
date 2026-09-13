import { NextResponse, after } from "next/server";
import { BookingError, createOrder } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";
import { QuoteError } from "@/lib/pricing";
import { createOrderSchema } from "@/lib/validation";

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
export async function POST(req: Request) {
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

  try {
    const order = await createOrder(parsed.data);

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
