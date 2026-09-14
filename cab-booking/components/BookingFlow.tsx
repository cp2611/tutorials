"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AIRPORT_ZONES,
  CAB_TYPES,
  LEAD_TIME_HOURS,
  FEATURED_ROUTES,
  RENTAL_PACKAGES,
  ROUTES,
  SERVICE_CITIES,
  TOUR_PACKAGES,
  TRIP_TYPES,
  type CabTypeId,
  type TripType,
} from "@/config/fares";
import { FareBreakup } from "@/components/FareBreakup";
import { inr } from "@/lib/format";
import { istLocalIn, istLocalToIso } from "@/lib/ist";
import { loadUtm } from "@/lib/utm";
import type { Quote } from "@/lib/pricing";

type QuoteRow = { cabTypeId: CabTypeId; quote: Quote };
type Step = "trip" | "cabs" | "details";

const DESTINATIONS = Array.from(new Set(ROUTES.map((r) => r.to))).sort();

export function BookingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trip");

  const [tripType, setTripType] = useState<TripType>("outstation_oneway");
  const [pickupCity, setPickupCity] = useState(SERVICE_CITIES[0]);
  const [dropCity, setDropCity] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [pickupLocal, setPickupLocal] = useState("");
  const [returnLocal, setReturnLocal] = useState("");
  const [zoneId, setZoneId] = useState(AIRPORT_ZONES[0]?.id ?? "");
  const [packageId, setPackageId] = useState(RENTAL_PACKAGES[1]?.id ?? RENTAL_PACKAGES[0]?.id ?? "");
  const [tourId, setTourId] = useState(TOUR_PACKAGES[0]?.id ?? "");

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [selectedCab, setSelectedCab] = useState<CabTypeId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [passengers, setPassengers] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const isOutstation = tripType === "outstation_oneway" || tripType === "outstation_round";
  const isRound = tripType === "outstation_round";
  const selectedTour = TOUR_PACKAGES.find((t) => t.id === tourId);

  const knownRoute = useMemo(() => {
    if (!isOutstation || !dropCity) return undefined;
    const a = pickupCity.toLowerCase();
    const b = dropCity.trim().toLowerCase();
    return ROUTES.find(
      (r) =>
        (r.from.toLowerCase() === a && r.to.toLowerCase() === b) ||
        (r.from.toLowerCase() === b && r.to.toLowerCase() === a),
    );
  }, [isOutstation, pickupCity, dropCity]);

  const needsManualDistance = (isOutstation && dropCity.trim().length > 1 && !knownRoute) || tripType === "local";

  const minPickup = istLocalIn(LEAD_TIME_HOURS[tripType] ?? 2);

  /** Whatever we know about the trip, in the shape the quote API expects. */
  const tripPayload = useCallback(
    () => ({
      tripType,
      pickupCity,
      dropCity: isOutstation ? dropCity.trim() : undefined,
      distanceKm: needsManualDistance ? Number(distanceKm) || undefined : knownRoute?.km,
      pickupAt: istLocalToIso(pickupLocal),
      returnAt: isRound ? istLocalToIso(returnLocal) : undefined,
      zoneId: tripType === "airport" ? zoneId : undefined,
      packageId:
        tripType === "rental" ? packageId : tripType === "tour" ? tourId : undefined,
    }),
    [
      tripType, pickupCity, dropCity, isOutstation, needsManualDistance, distanceKm,
      knownRoute, pickupLocal, isRound, returnLocal, zoneId, packageId, tourId,
    ],
  );

  async function fetchQuotes() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tripPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not price that trip.");
        return;
      }
      if (data.problems?.length > 0) {
        setError(data.problems[0].message);
        return;
      }
      setQuotes(data.quotes);
      setSelectedCab((prev) => prev ?? data.quotes[1]?.cabTypeId ?? data.quotes[0]?.cabTypeId ?? null);
      setStep("cabs");
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Keep prices live while the customer changes their mind on the pricing step.
  useEffect(() => {
    if (step !== "cabs") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(tripPayload()),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.quotes) setQuotes(data.quotes);
      } catch {
        /* keep showing the last good prices */
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, tripPayload]);

  useEffect(() => {
    if (step !== "trip") resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const selectedQuote = quotes.find((q) => q.cabTypeId === selectedCab)?.quote;

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCab) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...tripPayload(),
          cabTypeId: selectedCab,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          pickupAddress: pickupAddress || undefined,
          dropAddress: dropAddress || undefined,
          passengers: passengers ? Number(passengers) : undefined,
          customerNotes: customerNotes || undefined,
          acceptTerms,
          website: honeypot,
          utm: loadUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the booking.");
        setSubmitting(false);
        return;
      }
      router.push(`/booking/${data.id}`);
    } catch {
      setError("Network problem. Your booking was not created — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      {/* ---------------------------------------------------------- Step 1 */}
      <section className="card p-4 sm:p-6">
        {/* One tap from an ad click to a priced route. These are the trips the
            campaigns point at, so they should not need any typing at all. */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Popular from Mumbai
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURED_ROUTES.map((r) => {
              const active = isOutstation && dropCity.trim().toLowerCase() === r.to.toLowerCase();
              return (
                <button
                  key={r.to}
                  type="button"
                  onClick={() => {
                    setTripType("outstation_oneway");
                    setDropCity(r.to);
                    setStep("trip");
                    setQuotes([]);
                    setError(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-brand-500 bg-brand-50"
                      : "border-ink-200 bg-white hover:border-ink-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink-900">Mumbai → {r.to}</span>
                  <span className="block text-xs text-ink-500">{r.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Trip type">
          {TRIP_TYPES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tripType === t.id}
              onClick={() => {
                setTripType(t.id);
                setStep("trip");
                setQuotes([]);
                setError(null);
              }}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                tripType === t.id
                  ? "bg-ink-900 text-white"
                  : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(isOutstation || tripType === "rental" || tripType === "local" || tripType === "tour") && (
            <div>
              <label className="label" htmlFor="pickupCity">Pickup city</label>
              <select
                id="pickupCity"
                className="input"
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
              >
                {SERVICE_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {isOutstation && (
            <div>
              <label className="label" htmlFor="dropCity">Destination city</label>
              <input
                id="dropCity"
                className="input"
                list="destinations"
                placeholder="e.g. Jaipur"
                value={dropCity}
                onChange={(e) => setDropCity(e.target.value)}
                autoComplete="off"
              />
              <datalist id="destinations">
                {DESTINATIONS.map((d) => <option key={d} value={d} />)}
              </datalist>
              {knownRoute && (
                <p className="mt-1.5 text-xs text-ink-500">
                  {knownRoute.km} km each way — priced on our measured route.
                </p>
              )}
            </div>
          )}

          {tripType === "airport" && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="zoneId">Route</label>
              <select id="zoneId" className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                {AIRPORT_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.label}</option>
                ))}
              </select>
            </div>
          )}

          {tripType === "tour" && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="tourId">Sightseeing package</label>
              <select id="tourId" className="input" value={tourId} onChange={(e) => setTourId(e.target.value)}>
                {TOUR_PACKAGES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.hours} hrs / {t.km} km
                  </option>
                ))}
              </select>
              {selectedTour && (
                <div className="mt-3 rounded-xl bg-ink-50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Where you&apos;ll go
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {selectedTour.highlights.map((h) => (
                      <li key={h} className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-700 ring-1 ring-ink-200">
                        {h}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 text-xs text-ink-500">
                    Entry tickets and ferry charges are not included.
                  </p>
                </div>
              )}
            </div>
          )}

          {tripType === "rental" && (
            <div>
              <label className="label" htmlFor="packageId">Package</label>
              <select id="packageId" className="input" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                {RENTAL_PACKAGES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {needsManualDistance && (
            <div>
              <label className="label" htmlFor="distanceKm">
                Approximate distance (km){tripType !== "local" && ", one way"}
              </label>
              <input
                id="distanceKm"
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 320"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                We&apos;ll confirm the exact distance and fare before you pay anything more.
              </p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="pickupAt">Pickup date &amp; time</label>
            <input
              id="pickupAt"
              className="input"
              type="datetime-local"
              min={minPickup}
              value={pickupLocal}
              onChange={(e) => setPickupLocal(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-500">
              We need {LEAD_TIME_HOURS[tripType]} hours&apos; notice for this trip.
            </p>
          </div>

          {isRound && (
            <div>
              <label className="label" htmlFor="returnAt">Return date &amp; time</label>
              <input
                id="returnAt"
                className="input"
                type="datetime-local"
                min={pickupLocal || minPickup}
                value={returnLocal}
                onChange={(e) => setReturnLocal(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && step === "trip" && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button onClick={fetchQuotes} disabled={loading} className="btn-primary mt-5">
          {loading ? "Checking prices…" : "See prices →"}
        </button>
      </section>

      <div ref={resultsRef} />

      {/* ---------------------------------------------------------- Step 2 */}
      {step !== "trip" && quotes.length > 0 && (
        <section className="card p-4 sm:p-6">
          <h2 className="text-lg font-bold text-ink-900">Choose your cab</h2>
          <p className="mt-1 text-sm text-ink-500">All-inclusive fares. No surge, no hidden charges.</p>

          <div className="mt-4 grid gap-2.5">
            {quotes.map(({ cabTypeId, quote }) => {
              const cab = CAB_TYPES.find((c) => c.id === cabTypeId)!;
              const active = selectedCab === cabTypeId;
              return (
                <button
                  key={cabTypeId}
                  onClick={() => setSelectedCab(cabTypeId)}
                  aria-pressed={active}
                  // min-w-0 is load-bearing: as a grid item this button defaults to
                  // min-width:auto, and the truncated model line below sets
                  // white-space:nowrap — so without it the row's min-content is the
                  // full "Maruti Ertiga, Toyota Rumion, Kia Carens" string and the
                  // whole page scrolls sideways on a phone.
                  className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border-2 p-3.5 text-left transition ${
                    active ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white hover:border-ink-300"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{cab.name}</p>
                    <p className="truncate text-xs text-ink-500">
                      {cab.seats} seats · {cab.bags} bags · {cab.examples}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums text-ink-900">{inr(quote.total)}</p>
                    <p className="text-xs text-ink-500">{inr(quote.advance)} now</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedQuote && (
            <div className="mt-5 rounded-xl border border-ink-200 p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-500">Fare breakup</h3>
              <FareBreakup quote={selectedQuote} />
            </div>
          )}

          {step === "cabs" && (
            <button onClick={() => setStep("details")} disabled={!selectedCab} className="btn-primary mt-5">
              Continue →
            </button>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------- Step 3 */}
      {step === "details" && selectedQuote && (
        <section className="card p-4 sm:p-6">
          <h2 className="text-lg font-bold text-ink-900">Your details</h2>
          <p className="mt-1 text-sm text-ink-500">
            We&apos;ll call you on this number to confirm. No payment needed on this step.
          </p>

          <form onSubmit={submitBooking} className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Bots fill this in; humans never see it. */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden
              value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
              className="absolute left-[-9999px] h-px w-px opacity-0"
            />

            <div>
              <label className="label" htmlFor="customerName">Full name</label>
              <input id="customerName" className="input" required autoComplete="name"
                value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <div>
              <label className="label" htmlFor="customerPhone">Mobile number</label>
              <input id="customerPhone" className="input" required type="tel" inputMode="numeric"
                autoComplete="tel" placeholder="10-digit mobile"
                value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerEmail">
                Email <span className="font-normal text-ink-400">— for your booking confirmation</span>
              </label>
              <input id="customerEmail" className="input" type="email" autoComplete="email"
                value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="pickupAddress">Pickup address</label>
              <input id="pickupAddress" className="input" placeholder="House / building, area, landmark"
                value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
            </div>

            {tripType !== "rental" && tripType !== "tour" && (
              <div className="sm:col-span-2">
                <label className="label" htmlFor="dropAddress">Drop address</label>
                <input id="dropAddress" className="input" placeholder="Where are we dropping you?"
                  value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} />
              </div>
            )}

            <div>
              <label className="label" htmlFor="passengers">Passengers</label>
              <input id="passengers" className="input" type="number" inputMode="numeric" min={1} max={50}
                value={passengers} onChange={(e) => setPassengers(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerNotes">
                Anything we should know? <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <textarea id="customerNotes" className="input" rows={2} placeholder="Luggage, child seat, extra stops…"
                value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
            </div>

            <label className="flex items-start gap-3 sm:col-span-2">
              <input type="checkbox" required className="mt-1 h-5 w-5 rounded border-ink-300"
                checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
              <span className="text-sm leading-relaxed text-ink-600">
                I accept the <a href="/terms" target="_blank" className="font-medium text-brand-600 underline">terms</a> and the{" "}
                <a href="/refund-policy" target="_blank" className="font-medium text-brand-600 underline">cancellation &amp; refund policy</a>.
                I understand tolls, parking and state permit charges are paid directly to the driver.
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>
            )}

            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Creating your booking…" : `Book — pay ${inr(selectedQuote.advance)} advance`}
              </button>
              <p className="mt-2.5 text-center text-xs text-ink-500">
                Balance of {inr(selectedQuote.balance)} is paid to the driver at drop.
              </p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
