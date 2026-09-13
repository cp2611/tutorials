import { NextResponse, after } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getOrder, updateOrder } from "@/lib/db";
import { notifyAssignment, notifyPaymentConfirmed } from "@/lib/notify";
import { assignSchema, verifyPaymentSchema } from "@/lib/validation";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner's control surface: verify a payment, assign a cab, cancel, annotate.
 * Every branch re-checks the admin cookie — these fields are the difference
 * between a booking and a promise.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const now = new Date().toISOString();
  const back = new URL(`/admin/orders/${id}`, req.url);

  switch (action) {
    case "verify_payment": {
      const parsed = verifyPaymentSchema.safeParse(Object.fromEntries(form));
      const updated = await updateOrder(id, {
        status: "CONFIRMED",
        paymentVerifiedAt: now,
        paymentReference: parsed.success
          ? parsed.data.paymentReference || order.paymentReference
          : order.paymentReference,
      });
      if (updated) {
        after(async () => {
          const results = await notifyPaymentConfirmed(updated);
          const failed = results.filter(
            (r) => !r.ok && r.error !== "disabled" && r.error !== "not configured",
          );
          if (failed.length > 0) console.error("[notify] payment confirmed", id, failed);
        });
      }
      break;
    }

    case "assign": {
      const parsed = assignSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success) {
        back.searchParams.set("error", parsed.error.issues[0]?.message ?? "Check the driver details.");
        return NextResponse.redirect(back, 303);
      }
      const updated = await updateOrder(id, {
        ...parsed.data,
        status: "ASSIGNED",
        assignedAt: now,
      });
      if (updated) {
        after(async () => {
          const results = await notifyAssignment(updated);
          const failed = results.filter(
            (r) => !r.ok && r.error !== "disabled" && r.error !== "not configured",
          );
          if (failed.length > 0) console.error("[notify] assignment", id, failed);
        });
      }
      break;
    }

    case "set_status": {
      const status = String(form.get("status") ?? "") as OrderStatus;
      if (!ORDER_STATUSES.includes(status)) {
        back.searchParams.set("error", "Unknown status.");
        return NextResponse.redirect(back, 303);
      }
      await updateOrder(id, {
        status,
        cancelledReason:
          status === "CANCELLED" ? String(form.get("reason") ?? "") || undefined : order.cancelledReason,
      });
      break;
    }

    case "note": {
      await updateOrder(id, { adminNotes: String(form.get("adminNotes") ?? "").slice(0, 2000) });
      break;
    }

    default:
      back.searchParams.set("error", "Unknown action.");
      return NextResponse.redirect(back, 303);
  }

  back.searchParams.set("saved", "1");
  return NextResponse.redirect(back, 303);
}
