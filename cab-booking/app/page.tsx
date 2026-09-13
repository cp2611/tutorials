import { BookingFlow } from "@/components/BookingFlow";
import { BUSINESS } from "@/config/business";
import { CAB_TYPES, SERVICE_CITIES } from "@/config/fares";

/**
 * The ad landing page IS the pricing and checkout page.
 *
 * A paid click arrives here and can reach a created booking without a single
 * page navigation: pick the trip, see every cab priced, enter a name and phone.
 * Everything above the fold exists to make that first tap feel safe.
 */
export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="text-center">
        <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
          Book a cab in 60 seconds
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-balance text-ink-600">
          {BUSINESS.tagline}. See the full fare before you book — pay a small advance,
          settle the rest with the driver.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {BUSINESS.trustBadges.map((b) => (
            <span key={b} className="chip">✓ {b}</span>
          ))}
        </div>
      </section>

      <BookingFlow />

      <section className="card p-5">
        <h2 className="text-base font-bold text-ink-900">How it works</h2>
        <ol className="mt-3 grid gap-4 sm:grid-cols-4">
          {[
            ["Tell us the trip", "Pick your route, date and cab. See the full fare instantly."],
            ["Pay the advance", "Scan the UPI code. The amount and booking number are already filled in."],
            [
              "We assign your cab",
              `Driver and vehicle details reach you within ${BUSINESS.confirmationWindowHours} hours.`,
            ],
            ["Travel", "Pay the balance to the driver at drop, plus tolls and parking."],
          ].map(([title, body], i) => (
            <li key={title}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2 font-semibold text-ink-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold text-ink-900">Our fleet</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {CAB_TYPES.map((c) => (
            <li key={c.id} className="rounded-xl border border-ink-200 p-3.5">
              <p className="font-semibold text-ink-900">{c.name}</p>
              <p className="mt-0.5 text-sm text-ink-500">{c.seats} seats · {c.bags} bags</p>
              <p className="mt-1 text-xs text-ink-400">{c.examples}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-500">
          Pickups available from {SERVICE_CITIES.join(", ")}. Travelling from somewhere else?
          Call us at{" "}
          <a href={`tel:${BUSINESS.phone}`} className="font-medium text-brand-600 underline">
            {BUSINESS.phone}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
