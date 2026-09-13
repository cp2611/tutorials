import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BUSINESS } from "@/config/business";
import { REFUND_POLICY } from "@/config/business";
import { FareBreakup } from "@/components/FareBreakup";
import { OrderSummary } from "@/components/OrderSummary";
import { PaymentPanel } from "@/components/PaymentPanel";
import { StatusTimeline } from "@/components/StatusTimeline";
import { getOrder } from "@/lib/db";
import { inr, istDateTime } from "@/lib/format";
import { buildUpiQrDataUrl, buildUpiUri } from "@/lib/upi";
import { STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

/**
 * The page a customer lands on the instant a booking exists.
 *
 * Paying money and then seeing nothing is what a scam feels like, so this page
 * always shows a booking number, the exact fare, and what happens next —
 * whether or not the advance has been paid.
 */
export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id.toUpperCase());
  if (!order) notFound();

  const awaitingPayment = order.status === "PENDING_PAYMENT";
  const qrDataUrl = awaitingPayment ? await buildUpiQrDataUrl(order.id, order.advanceAmount) : "";
  const upiUri = awaitingPayment ? buildUpiUri(order.id, order.advanceAmount) : "";

  return (
    <div className="grid gap-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-500">Booking number</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-ink-900">{order.id}</p>
          </div>
          <span className="rounded-full bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-700">
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {awaitingPayment
            ? "Your trip is held. Pay the advance below to confirm it — we can't assign a cab until then."
            : order.status === "PAYMENT_CLAIMED"
              ? `Thanks — we're checking our account for your payment and will send cab details within ${BUSINESS.confirmationWindowHours} hours.`
              : order.status === "CONFIRMED"
                ? `Payment confirmed. We're assigning your cab and will share driver details within ${BUSINESS.confirmationWindowHours} hours.`
                : order.status === "ASSIGNED"
                  ? "Your cab is assigned. Driver details are below."
                  : order.status === "COMPLETED"
                    ? "Trip completed. Thanks for travelling with us."
                    : "This booking was cancelled."}
        </p>
      </section>

      {awaitingPayment && (
        <PaymentPanel
          bookingId={order.id}
          upiUri={upiUri}
          qrDataUrl={qrDataUrl}
          payableAmount={order.payableAmount}
        />
      )}

      {order.status === "ASSIGNED" && (
        <section className="card border-green-300 bg-green-50 p-5">
          <h2 className="text-base font-bold text-ink-900">🚗 Your cab</h2>
          <dl className="mt-3 divide-y divide-green-200 text-sm">
            {[
              ["Driver", order.driverName],
              ["Driver phone", order.driverPhone],
              ["Vehicle", order.vehicleModel],
              ["Number plate", order.vehicleNumber],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-4 py-2.5">
                  <dt className="w-28 shrink-0 text-ink-500">{k}</dt>
                  <dd className="font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-3 text-sm text-ink-700">
            Pay <strong>{inr(order.balanceAmount)}</strong> to the driver at drop, plus tolls, parking
            and state permit charges.
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Any problem during the trip, call us first at {BUSINESS.phone} — not the driver.
          </p>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold text-ink-900">Trip details</h2>
        <OrderSummary order={order} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold text-ink-900">Fare</h2>
        <FareBreakup quote={order.quote} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-base font-bold text-ink-900">Progress</h2>
        <StatusTimeline status={order.status} />
      </section>

      <section className="card p-5 text-sm text-ink-600">
        <h2 className="mb-2 text-base font-bold text-ink-900">Need to change or cancel?</h2>
        <p className="leading-relaxed">
          Call or WhatsApp us at{" "}
          <a href={`tel:${BUSINESS.phone}`} className="font-medium text-brand-600 underline">
            {BUSINESS.phone}
          </a>{" "}
          with your booking number. Cancel more than {REFUND_POLICY.freeCancellationHours} hours before
          pickup ({istDateTime(order.pickupAt)}) and your advance is refunded in full.
        </p>
      </section>
    </div>
  );
}
