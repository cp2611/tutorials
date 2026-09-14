import {
  ADVANCE,
  AIRPORT_ZONES,
  CAB_TYPES,
  EXCLUSIONS_BY_TRIP,
  LEAD_TIME_HOURS,
  LOCAL,
  MAX_ADVANCE_BOOKING_DAYS,
  OUTSTATION,
  RENTAL_PACKAGES,
  ROUTES,
  TOUR_PACKAGES,
  SERVICE_CITIES,
  type CabTypeId,
  type PerCab,
  type TripType,
} from "@/config/fares";

export type QuoteLine = { label: string; detail?: string; amount: number };

export type Quote = {
  tripType: TripType;
  cabTypeId: CabTypeId;
  cabTypeName: string;
  lines: QuoteLine[];
  total: number;
  advance: number;
  balance: number;
  exclusions: string[];
  distanceKm?: number;
  chargeableKm?: number;
  days?: number;
  /** True when the distance came from the customer, not our measured route table. */
  provisional: boolean;
  notes: string[];
};

export type QuoteInput = {
  tripType: TripType;
  cabTypeId: CabTypeId;
  pickupCity?: string;
  dropCity?: string;
  /** Customer-supplied km, used only when the route is not in our table. */
  distanceKm?: number;
  /** ISO datetime string, interpreted in IST. */
  pickupAt?: string;
  returnAt?: string;
  zoneId?: string;
  packageId?: string;
};

const money = (n: number) => Math.round(n);
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

export function lookupRoute(from?: string, to?: string): (typeof ROUTES)[number] | undefined {
  if (!from || !to) return undefined;
  const a = from.trim().toLowerCase();
  const b = to.trim().toLowerCase();
  return ROUTES.find(
    (r) =>
      (r.from.toLowerCase() === a && r.to.toLowerCase() === b) ||
      (r.from.toLowerCase() === b && r.to.toLowerCase() === a),
  );
}

export function lookupRouteKm(from?: string, to?: string): number | undefined {
  return lookupRoute(from, to)?.km;
}

/**
 * IST hour of an ISO datetime. Computed by shifting the UTC instant, never via
 * the server's local zone — Vercel runs in UTC and would otherwise mis-apply
 * the night charge by five and a half hours.
 */
function istHour(iso: string): number {
  const istMs = new Date(iso).getTime() + 5.5 * 3600e3;
  return new Date(istMs).getUTCHours();
}

/** Inclusive calendar-day count for a round trip; always at least 1. */
export function tripDays(pickupAt?: string, returnAt?: string): number {
  if (!pickupAt || !returnAt) return 1;
  const start = new Date(pickupAt).getTime() + 5.5 * 3600e3;
  const end = new Date(returnAt).getTime() + 5.5 * 3600e3;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  const startDay = Math.floor(start / 86400e3);
  const endDay = Math.floor(end / 86400e3);
  return Math.max(1, endDay - startDay + 1);
}

function computeAdvance(total: number, tripType: TripType): number {
  const flat = ADVANCE.flat[tripType] ?? 500;
  // The flat target is the anchor, bounded on both sides by a share of the fare:
  // it scales up on an expensive trip and down on a cheap one.
  const bounded = Math.min(
    Math.max(flat, total * ADVANCE.minPercentOfFare),
    total * ADVANCE.maxPercentOfFare,
  );
  let adv = Math.floor(bounded / ADVANCE.roundTo) * ADVANCE.roundTo;
  // The floor keeps the advance meaningful, but must not swallow a small fare.
  const floor = Math.min(ADVANCE.floor, total * ADVANCE.floorMaxPercentOfFare);
  adv = Math.max(adv, Math.floor(floor / ADVANCE.roundTo) * ADVANCE.roundTo);
  return Math.min(adv, total);
}

/**
 * How a package bills once you go past what it includes.
 *
 * The industry rule is "whichever is higher": run 10 hours but only 70 km and
 * you pay two extra hours; run 8 hours but 100 km and you pay twenty extra km.
 * You are never charged for both.
 *
 * The overage is not quoted at booking because nobody knows it yet — it is
 * settled with the driver at the end. What the customer gets up front is the
 * rule and the rates, in writing, which is what stops the argument later.
 */
export function overageRule(
  pkg: { hours: number; km: number; extraPerHour: PerCab; extraPerKm: PerCab },
  cabTypeId: CabTypeId,
): string {
  return (
    `Beyond ${pkg.hours} hours or ${pkg.km} km: ₹${pkg.extraPerHour[cabTypeId]} per extra hour ` +
    `or ₹${pkg.extraPerKm[cabTypeId]} per extra km — whichever is higher, not both. ` +
    `Settled with the driver at the end of the trip.`
  );
}

export class QuoteError extends Error {}

export function buildQuote(input: QuoteInput): Quote {
  const cab = CAB_TYPES.find((c) => c.id === input.cabTypeId);
  if (!cab) throw new QuoteError("Unknown cab type.");

  const lines: QuoteLine[] = [];
  const notes: string[] = [];
  let provisional = false;
  let distanceKm: number | undefined;
  let chargeableKm: number | undefined;
  let days: number | undefined;

  switch (input.tripType) {
    case "outstation_oneway":
    case "outstation_round": {
      const isRound = input.tripType === "outstation_round";
      const route = lookupRoute(input.pickupCity, input.dropCity);
      distanceKm = route?.km ?? input.distanceKm;
      if (!distanceKm || distanceKm <= 0) {
        throw new QuoteError("Enter the approximate one-way distance in km.");
      }
      if (!route) {
        provisional = true;
        notes.push(
          "Distance was entered by you, so this is an estimate. We confirm the exact fare before you pay anything more.",
        );
      }
      days = isRound ? tripDays(input.pickupAt, input.returnAt) : 1;

      // A flat drop rate, where we have one, beats any per-km formula: it is the
      // price the partner actually quotes on a corridor with return loads.
      if (!isRound && route?.oneWayFlat) {
        lines.push({
          label: `${route.from} → ${route.to} one-way drop`,
          detail: `Flat fare for the ${route.km} km drop, driver allowance included.`,
          amount: money(route.oneWayFlat[cab.id]),
        });
        break;
      }

      const card = isRound ? OUTSTATION.roundTrip : OUTSTATION.oneWay;
      const rawKm = isRound ? distanceKm * 2 : distanceKm;
      const minKm = isRound ? OUTSTATION.roundTrip.minKmPerDay * days : OUTSTATION.oneWay.minKm;
      chargeableKm = Math.max(rawKm, minKm);

      const rate = card.perKm[cab.id];
      lines.push({
        label: `Fare (${chargeableKm} km × ₹${rate}/km)`,
        detail: isRound
          ? chargeableKm > rawKm
            ? `Route is ${rawKm} km return, but a round trip bills a minimum of ${OUTSTATION.roundTrip.minKmPerDay} km per day (${days} day${days > 1 ? "s" : ""}).`
            : `${distanceKm} km each way.`
          : chargeableKm > rawKm
            ? `Route is ${distanceKm} km, billed at our ${OUTSTATION.oneWay.minKm} km minimum for a drop.`
            : `${distanceKm} km, one way only — you don't pay for the return.`,
        amount: money(chargeableKm * rate),
      });

      // Only a round trip carries the driver's allowance: on a drop the car is
      // released at the destination, which is exactly why a drop costs less.
      if (isRound) {
        const allowance = OUTSTATION.roundTrip.driverAllowancePerDay[cab.id] * days;
        lines.push({
          label: `Driver allowance (${days} day${days > 1 ? "s" : ""})`,
          detail: "Driver's food and stay, as per standard outstation practice.",
          amount: money(allowance),
        });
      }
      break;
    }

    case "tour": {
      const pkg = TOUR_PACKAGES.find((t) => t.id === input.packageId);
      if (!pkg) throw new QuoteError("Choose a sightseeing package.");
      lines.push({
        label: pkg.label,
        detail: `${pkg.hours} hours / ${pkg.km} km included, car and driver at your disposal.`,
        amount: money(pkg.price[cab.id]),
      });
      notes.push(`Stops: ${pkg.highlights.join(" · ")}.`);
      notes.push(overageRule(pkg, cab.id));
      break;
    }

    case "airport": {
      const zone = AIRPORT_ZONES.find((z) => z.id === input.zoneId);
      if (!zone) throw new QuoteError("Choose an airport route.");
      lines.push({
        label: zone.label,
        detail: "Flat fare, one way.",
        amount: money(zone.price[cab.id]),
      });
      notes.push("Includes 45 minutes of free waiting at the airport after landing.");
      break;
    }

    case "rental": {
      const pkg = RENTAL_PACKAGES.find((p) => p.id === input.packageId);
      if (!pkg) throw new QuoteError("Choose a rental package.");
      lines.push({
        label: `${pkg.label} package`,
        detail: "Car and driver at your disposal within city limits.",
        amount: money(pkg.price[cab.id]),
      });
      notes.push(overageRule(pkg, cab.id));
      break;
    }

    case "local": {
      const km = input.distanceKm;
      if (!km || km <= 0) throw new QuoteError("Enter the approximate distance in km.");
      distanceKm = km;
      chargeableKm = km;
      const metered = km * LOCAL.perKm[cab.id];
      const min = LOCAL.minFare[cab.id];
      if (metered < min) {
        lines.push({
          label: `Minimum fare (${cab.name})`,
          detail: `${km} km × ₹${LOCAL.perKm[cab.id]}/km is below our ₹${min} minimum.`,
          amount: money(min),
        });
      } else {
        lines.push({
          label: `Fare (${km} km × ₹${LOCAL.perKm[cab.id]}/km)`,
          amount: money(metered),
        });
      }
      provisional = true;
      notes.push("Fare is based on the distance you entered and is confirmed before pickup.");
      break;
    }

    default: {
      // Adding a trip type to config/fares.ts without pricing it here used to
      // fall straight through this switch and quote the customer ₹0. This makes
      // TypeScript reject the build instead, and throws if one ever slips past
      // at runtime.
      const unpriced: never = input.tripType;
      throw new QuoteError(`No fare rules for trip type "${String(unpriced)}".`);
    }
  }

  // Night charge applies to every trip type when pickup falls in the night window.
  if (input.pickupAt) {
    const h = istHour(input.pickupAt);
    const { nightChargeFromHour: from, nightChargeToHour: to } = OUTSTATION;
    if (h >= from || h < to) {
      lines.push({
        label: "Night charge",
        detail: `Pickup between ${from}:00 and ${String(to).padStart(2, "0")}:00.`,
        amount: money(OUTSTATION.nightCharge[cab.id]),
      });
    }
  }

  const total = roundTo10(lines.reduce((s, l) => s + l.amount, 0));
  const advance = computeAdvance(total, input.tripType);

  return {
    tripType: input.tripType,
    cabTypeId: cab.id,
    cabTypeName: cab.name,
    lines,
    total,
    advance,
    balance: total - advance,
    exclusions: [...EXCLUSIONS_BY_TRIP[input.tripType]],
    distanceKm,
    chargeableKm,
    days,
    provisional,
    notes,
  };
}

export type ScheduleProblem = { field: string; message: string };

/**
 * Refuses bookings we cannot actually service: outside our pickup cities, too
 * soon to arrange a cab, or absurdly far ahead. Runs on the server too — the
 * client version is only there to give fast feedback.
 */
export function validateSchedule(input: {
  tripType: TripType;
  pickupCity?: string;
  pickupAt?: string;
  returnAt?: string;
}): ScheduleProblem[] {
  const problems: ScheduleProblem[] = [];

  if (input.pickupCity) {
    const ok = SERVICE_CITIES.some(
      (c) => c.toLowerCase() === input.pickupCity!.trim().toLowerCase(),
    );
    if (!ok) {
      problems.push({
        field: "pickupCity",
        message: `We currently pick up only from ${SERVICE_CITIES.join(", ")}.`,
      });
    }
  }

  if (!input.pickupAt) {
    problems.push({ field: "pickupAt", message: "Choose a pickup date and time." });
    return problems;
  }

  const pickup = new Date(input.pickupAt).getTime();
  if (!Number.isFinite(pickup)) {
    problems.push({ field: "pickupAt", message: "That pickup time is not valid." });
    return problems;
  }

  const hoursAway = (pickup - Date.now()) / 3600e3;
  const required = LEAD_TIME_HOURS[input.tripType] ?? 2;
  if (hoursAway < required) {
    problems.push({
      field: "pickupAt",
      message: `We need at least ${required} hours' notice for this trip. Pick a later time, or call us for an urgent booking.`,
    });
  }
  if (hoursAway > MAX_ADVANCE_BOOKING_DAYS * 24) {
    problems.push({
      field: "pickupAt",
      message: `Bookings open ${MAX_ADVANCE_BOOKING_DAYS} days in advance.`,
    });
  }

  if (input.tripType === "outstation_round") {
    if (!input.returnAt) {
      problems.push({ field: "returnAt", message: "Choose a return date and time." });
    } else {
      const ret = new Date(input.returnAt).getTime();
      if (!Number.isFinite(ret) || ret <= pickup) {
        problems.push({ field: "returnAt", message: "Return must be after pickup." });
      }
    }
  }

  return problems;
}
