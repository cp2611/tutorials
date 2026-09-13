import { NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lets the booking page watch for its own confirmation while the customer is
 * still looking at the QR code.
 *
 * Returns only the status — never customer details — because the booking ID
 * alone is enough to call this, and a short ID is guessable.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await getOrder(id.toUpperCase());
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(
    { status: order.status, label: STATUS_LABELS[order.status] },
    { headers: { "cache-control": "no-store" } },
  );
}
