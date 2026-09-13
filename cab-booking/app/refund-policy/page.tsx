import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";
import { BUSINESS, REFUND_POLICY } from "@/config/business";

export const metadata: Metadata = { title: "Cancellation & refund policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Cancellation & refund policy">
      <h2>If you cancel</h2>
      <ul>
        <li>
          <strong>More than {REFUND_POLICY.freeCancellationHours} hours before pickup:</strong> the
          advance is refunded in full.
        </li>
        <li>
          <strong>Within {REFUND_POLICY.freeCancellationHours} hours of pickup:</strong>{" "}
          {REFUND_POLICY.lateCancellationRetainedPercent}% of the advance is retained to cover the
          driver and vehicle already committed to your trip. The rest is refunded.
        </li>
        <li>
          <strong>No-show at pickup:</strong> the advance is not refunded.
        </li>
      </ul>

      <h2>If we cancel</h2>
      <ul>
        <li>
          If we cannot arrange a cab, or the assigned cab does not reach you, your advance is refunded
          <strong> in full</strong>.
        </li>
        <li>
          If the confirmed fare turns out to be higher than quoted — which can happen when the distance
          was estimated — you may cancel for a <strong>full refund</strong>.
        </li>
      </ul>

      <h2>How to cancel</h2>
      <p>
        Call or WhatsApp {BUSINESS.phone} with your booking number. Cancellation takes effect when we
        acknowledge it, so please don&apos;t rely on email alone for a same-day trip.
      </p>

      <h2>How refunds are paid</h2>
      <ul>
        <li>
          Refunds go back to the <strong>same UPI account</strong> the advance came from, within{" "}
          {REFUND_POLICY.refundWorkingDays} working days of the cancellation being confirmed.
        </li>
        <li>We do not refund in cash, and we do not refund to a different account.</li>
        <li>
          Amounts paid directly to the driver (balance fare, tolls, parking) are between you and the
          operator and are not refundable by us.
        </li>
      </ul>

      <h2>Trip-related complaints</h2>
      <p>
        Raise any issue with us at {BUSINESS.phone} or {BUSINESS.email} within 48 hours of the trip,
        quoting your booking number. We investigate with the partner operator and respond within
        5 working days.
      </p>
    </LegalPage>
  );
}
