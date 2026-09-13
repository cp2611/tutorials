"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Collects the UPI reference after the customer pays.
 *
 * With no payment gateway there is no callback to trust, so the UTR is the only
 * thread tying a rupee in the bank account to a booking in the system. It is
 * mandatory, and it is explicitly a claim — the order stays unverified until a
 * human matches it against the statement.
 */
export function PaymentPanel({
  bookingId,
  upiUri,
  qrDataUrl,
  payableAmount,
}: {
  bookingId: string;
  upiUri: string;
  qrDataUrl: string;
  payableAmount: string;
}) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${bookingId}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save that reference number.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network problem. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 bg-ink-900 px-5 py-4 text-white">
        <p className="text-sm text-ink-300">Pay the advance to confirm</p>
        <p className="text-3xl font-bold tabular-nums">₹{payableAmount}</p>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`UPI QR code for ₹${payableAmount}, booking ${bookingId}`}
            width={220}
            height={220}
            className="rounded-xl border border-ink-200"
          />
          <a href={upiUri} className="btn-secondary mt-3 w-full sm:hidden">
            Open UPI app →
          </a>
        </div>

        <div>
          <ol className="grid gap-2.5 text-sm text-ink-700">
            <li><strong>1.</strong> Scan with any UPI app — GPay, PhonePe, Paytm, your bank app.</li>
            <li>
              <strong>2.</strong> The amount <strong>₹{payableAmount}</strong> and booking number{" "}
              <strong>{bookingId}</strong> are already filled in. Please don&apos;t change the amount.
            </li>
            <li><strong>3.</strong> After paying, enter the UPI reference number below.</li>
          </ol>

          <form onSubmit={submit} className="mt-5">
            <label className="label" htmlFor="utr">
              UPI reference / UTR number
            </label>
            <input
              id="utr"
              className="input font-mono tracking-wide"
              required
              inputMode="text"
              autoCapitalize="characters"
              placeholder="e.g. 412345678901"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-500">
              Your UPI app shows this on the success screen as &ldquo;UPI transaction ID&rdquo; or
              &ldquo;UTR&rdquo;. It&apos;s how we find your payment.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className="btn-primary mt-4">
              {submitting ? "Submitting…" : "I've paid — submit reference"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
