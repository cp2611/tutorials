import Link from "next/link";
import type { Metadata } from "next";
import { BUSINESS } from "@/config/business";
import { OrderSummary } from "@/components/OrderSummary";
import { StatusTimeline } from "@/components/StatusTimeline";
import { getOrder } from "@/lib/db";
import { customerMayView } from "@/lib/orders";
import { inr } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your booking", robots: { index: false } };

/**
 * Booking ID alone is never enough to open a booking — the matching phone
 * number is required. IDs are short enough to be guessed, and what's behind
 * them is a name, a home address and a travel schedule.
 */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; phone?: string }>;
}) {
  const { id, phone } = await searchParams;
  const attempted = Boolean(id && phone);
  const order = id ? await getOrder(id.trim().toUpperCase()) : null;
  const allowed = order && phone ? customerMayView(order, phone) : false;

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <section className="card p-5">
        <h1 className="text-xl font-bold text-ink-900">Track your booking</h1>
        <p className="mt-1 text-sm text-ink-500">
          Enter your booking number and the mobile number you booked with.
        </p>

        <form method="get" className="mt-4 grid gap-4">
          <div>
            <label className="label" htmlFor="id">Booking number</label>
            <input id="id" name="id" className="input font-mono uppercase tracking-wider"
              required placeholder="CAB4F7K2M" defaultValue={id ?? ""} autoCapitalize="characters" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" className="input" required type="tel" inputMode="numeric"
              placeholder="10-digit mobile" defaultValue={phone ?? ""} />
          </div>
          <button type="submit" className="btn-primary">Find my booking</button>
        </form>
      </section>

      {attempted && !allowed && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          We couldn&apos;t find a booking with that number and mobile. Check both, or call us at{" "}
          <a href={`tel:${BUSINESS.phone}`} className="font-medium underline">{BUSINESS.phone}</a>.
        </p>
      )}

      {allowed && order && (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold tracking-wider text-ink-900">{order.id}</p>
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-700">
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="mt-4">
            <OrderSummary order={order} />
          </div>

          {order.status === "ASSIGNED" && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-sm">
              <p className="font-bold text-ink-900">🚗 Your cab</p>
              <p className="mt-1.5 text-ink-700">
                {order.driverName} · {order.driverPhone}
                <br />
                {order.vehicleModel} · <strong>{order.vehicleNumber}</strong>
              </p>
              <p className="mt-2 text-ink-700">
                Balance <strong>{inr(order.balanceAmount)}</strong> payable to the driver, plus tolls,
                parking and state tax.
              </p>
            </div>
          )}

          <div className="mt-5">
            <StatusTimeline status={order.status} />
          </div>

          <Link href={`/booking/${order.id}`} className="btn-secondary mt-4 w-full">
            Open full booking page →
          </Link>
        </section>
      )}
    </div>
  );
}
