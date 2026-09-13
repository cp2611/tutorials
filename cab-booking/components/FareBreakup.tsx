import { inr } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

/**
 * The full line-item fare, including what the customer will be asked for by
 * the driver that is NOT in our number.
 *
 * Showing this before payment is the cheapest possible insurance against the
 * end-of-trip argument that starts "but the website said ₹6,500".
 */
export function FareBreakup({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  return (
    <div className="text-sm">
      <ul className="divide-y divide-ink-100">
        {quote.lines.map((line, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className="font-medium text-ink-800">{line.label}</p>
              {line.detail && !compact && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{line.detail}</p>
              )}
            </div>
            <p className="shrink-0 font-semibold tabular-nums text-ink-900">{inr(line.amount)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-1 flex items-center justify-between border-t-2 border-ink-900 py-3">
        <p className="font-semibold text-ink-900">Total fare</p>
        <p className="text-lg font-bold tabular-nums text-ink-900">{inr(quote.total)}</p>
      </div>

      <div className="grid gap-2 rounded-xl bg-brand-50 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-ink-700">Pay now to confirm</p>
          <p className="font-bold tabular-nums text-brand-700">{inr(quote.advance)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-ink-700">Pay the driver at drop</p>
          <p className="font-semibold tabular-nums text-ink-900">{inr(quote.balance)}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-accent-300 bg-accent-50 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          Not included — payable to the driver
        </p>
        <p className="mt-1 text-sm text-ink-700">{quote.exclusions.join(" · ")}</p>
      </div>

      {quote.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {quote.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-500">
              <span aria-hidden>ℹ</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
