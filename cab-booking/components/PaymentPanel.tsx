"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The payment screen.
 *
 * When bank-alert auto-verification is switched on, the customer types nothing:
 * they scan, they pay, and this panel watches for the confirmation that arrives
 * when the credit lands in the owner's account. A browser cannot observe a UPI
 * payment itself — the `upi://` handoff reports back to the Android app that
 * launched it — so the signal necessarily comes from the server.
 *
 * The manual reference box stays as a fallback, because SMS forwarding can fail
 * and a customer who cannot tell anyone they paid is a support call either way.
 * It starts collapsed and opens itself once waiting has gone on too long.
 */

/** How often to ask the server whether the payment has landed. */
const POLL_INTERVAL_MS = 4000;
/** After this long with no confirmation, surface the manual fallback. */
const FALLBACK_AFTER_MS = 75_000;
/** Stop polling eventually; the customer has probably walked away. */
const GIVE_UP_AFTER_MS = 15 * 60_000;

export function PaymentPanel({
  bookingId,
  upiUri,
  qrDataUrl,
  payableAmount,
  autoVerify,
}: {
  bookingId: string;
  upiUri: string;
  qrDataUrl: string;
  payableAmount: string;
  autoVerify: boolean;
}) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(!autoVerify);
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const startedAt = useRef(Date.now());

  // Watch for the booking being confirmed out from under this page.
  useEffect(() => {
    if (!autoVerify) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed > FALLBACK_AFTER_MS) setWaitedTooLong(true);
      if (elapsed > GIVE_UP_AFTER_MS) return;

      try {
        const res = await fetch(`/api/orders/${bookingId}/status`, { cache: "no-store" });
        if (res.ok) {
          const { status } = await res.json();
          if (status && status !== "PENDING_PAYMENT") {
            stopped = true;
            router.refresh();
            return;
          }
        }
      } catch {
        /* offline or flaky mobile data — just try again next tick */
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    let timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [autoVerify, bookingId, router]);

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
            <li>
              <strong>3.</strong>{" "}
              {autoVerify
                ? "That's it — this page confirms itself the moment your payment reaches us."
                : "After paying, enter the UPI reference number below."}
            </li>
          </ol>

          {autoVerify && (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 p-4"
              role="status"
              aria-live="polite"
            >
              <span
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded-full bg-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">Waiting for your payment…</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                  {waitedTooLong
                    ? "Still nothing. If you have already paid, enter your UPI reference below and we'll match it by hand."
                    : "Keep this page open. It usually confirms within a minute of you paying."}
                </p>
              </div>
            </div>
          )}

          {autoVerify && !showManual && (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="mt-3 text-sm font-medium text-brand-600 underline"
            >
              Already paid but nothing happened?
            </button>
          )}

          {(showManual || waitedTooLong) && (
            <form onSubmit={submit} className="mt-5 border-t border-ink-200 pt-5">
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
          )}
        </div>
      </div>
    </div>
  );
}
