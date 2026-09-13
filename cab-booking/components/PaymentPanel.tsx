import { BUSINESS } from "@/config/business";
import { inrExact } from "@/lib/format";
import { paidLink, questionLink } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

/**
 * The payment screen: scan, pay, then talk to a human.
 *
 * There is deliberately nothing to fill in. A browser cannot observe a UPI
 * payment — the `upi://` handoff reports back to the app that launched it — so
 * any form here would only ever collect the customer's claim that they paid,
 * which is not evidence and still leaves you checking your bank. Asking for a
 * reference number bought nothing and cost a step at the worst possible moment.
 *
 * So the customer is handed to WhatsApp instead, with the booking pre-filled.
 * That works the same whether they have already paid or want to ask something
 * first, and it puts the conversation where you are going to have it anyway.
 *
 * No state, no effects — a plain server component.
 */
export function PaymentPanel({
  order,
  upiUri,
  qrDataUrl,
}: {
  order: Order;
  upiUri: string;
  qrDataUrl: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 bg-ink-900 px-5 py-4 text-white">
        <p className="text-sm text-ink-300">Pay the advance to confirm</p>
        <p className="text-3xl font-bold tabular-nums">{inrExact(order.payableAmount)}</p>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`UPI QR code for ${inrExact(order.payableAmount)}, booking ${order.id}`}
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
            <li>
              <strong>1.</strong> Scan with any UPI app — GPay, PhonePe, Paytm, your bank app.
            </li>
            <li>
              <strong>2.</strong> The amount <strong>{inrExact(order.payableAmount)}</strong> and booking
              number <strong>{order.id}</strong> are already filled in. Please don&apos;t change the
              amount.
            </li>
            <li>
              <strong>3.</strong> Message us on WhatsApp so we can confirm and send your cab details.
            </li>
          </ol>

          <a
            href={paidLink(order)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-4 text-base font-semibold text-ink-900 shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
          >
            <WhatsAppIcon />
            I&apos;ve paid — message us on WhatsApp
          </a>

          <p className="mt-2.5 text-center text-xs text-ink-500">
            Your booking details are already in the message. Just hit send.
          </p>

          <div className="mt-5 border-t border-ink-200 pt-4 text-sm">
            <p className="font-medium text-ink-800">Want to check something first?</p>
            <p className="mt-0.5 text-ink-600">
              You don&apos;t have to pay yet — ask us anything about the trip or the fare.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={questionLink(order)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <WhatsAppIcon /> Chat before paying
              </a>
              <a href={`tel:${BUSINESS.phone}`} className="btn-secondary">
                📞 Call {BUSINESS.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.5h-.01a9.44 9.44 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.47-.23-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.2-4.24 9.45-9.44 9.45M20.5 3.49A11.8 11.8 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.86c0 2.09.55 4.13 1.59 5.93L.08 24l6.35-1.66a11.9 11.9 0 0 0 5.61 1.43h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.47-8.39" />
    </svg>
  );
}
