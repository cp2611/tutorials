/**
 * ============================================================================
 *  FARE TABLE  —  edit numbers here, redeploy, prices change everywhere.
 *  Fares are NEVER hardcoded in pages. This file is the single source of truth.
 *
 *  IMPORTANT: every quote is SNAPSHOTTED onto the order at booking time, so
 *  changing a rate here never rewrites the price an existing customer agreed to.
 * ============================================================================
 */

export type TripType =
  | "outstation_oneway"
  | "outstation_round"
  | "tour"
  | "airport"
  | "rental"
  | "local";

export const TRIP_TYPES: { id: TripType; label: string; blurb: string }[] = [
  { id: "outstation_oneway", label: "Outstation one-way", blurb: "City to city, drop only" },
  { id: "outstation_round", label: "Outstation round trip", blurb: "Return journey, multi-day" },
  { id: "tour", label: "Mumbai Darshan", blurb: "Guided city sightseeing" },
  { id: "airport", label: "Airport transfer", blurb: "Fixed price, flight tracked" },
  { id: "rental", label: "Hourly rental", blurb: "Car at your disposal" },
  { id: "local", label: "Local drop", blurb: "Point to point in the city" },
];

export type CabTypeId = "hatchback" | "sedan" | "suv" | "crysta" | "tempo";

/**
 * A price table with one entry per cab type — the shape almost every rate in
 * this file takes, because a Dzire and a Tempo Traveller never cost the same.
 *
 * Written with `satisfies` rather than `as`. An `as` assertion would silently
 * accept a table with a cab type missing, and the fare for that cab would come
 * out as NaN on the live site. `satisfies` makes TypeScript refuse the build
 * instead, so adding a sixth cab type below forces you to price it everywhere.
 */
export type PerCab = Record<CabTypeId, number>;

/** Same guarantee, one entry per trip type. */
export type PerTrip = Record<TripType, number>;

export const CAB_TYPES: {
  id: CabTypeId;
  name: string;
  seats: number;
  bags: number;
  examples: string;
}[] = [
  { id: "hatchback", name: "Hatchback", seats: 4, bags: 2, examples: "Wagon R, Celerio, Indica" },
  { id: "sedan", name: "Sedan", seats: 4, bags: 3, examples: "Dzire, Etios, Aura" },
  { id: "suv", name: "SUV", seats: 6, bags: 4, examples: "Ertiga, Marazzo" },
  { id: "crysta", name: "Innova Crysta", seats: 6, bags: 4, examples: "Innova Crysta" },
  { id: "tempo", name: "Tempo Traveller", seats: 12, bags: 12, examples: "Force Tempo 12-seater" },
];

/** ---------------------------------------------------------------- OUTSTATION
 *  A one-way drop and a round trip are two different products with two
 *  different rate cards, so they get two tables.
 *
 *  A one-way drop bills the distance travelled and nothing else — no return
 *  leg, no driver allowance. That is not a discount, it is how the whole
 *  Indian market sells it ("pay only for the distance you travel"), and it is
 *  the reason one-way is the cheaper product. Charging for the driver's empty
 *  return is economically tempting and commercially fatal: it puts you 60-80%
 *  above every aggregator on the same route. Your margin on a drop comes from
 *  buying below these rates, not from billing the return.
 *
 *  A round trip holds the car for the whole trip, so it bills both directions,
 *  a daily minimum, and the driver's allowance — but at a lower per-km rate.
 *
 *  Rates below are the market rates found for Mumbai in Sept 2026 (see
 *  README). They are what you can CHARGE. What you PAY your partner is a
 *  separate number you must get from them before advertising.
 */
export const OUTSTATION = {
  oneWay: {
    perKm: { hatchback: 10, sedan: 12, suv: 15, crysta: 19, tempo: 24 } satisfies PerCab,
    /** Very short drops still cost the operator a full trip out and back. */
    minKm: 130,
  },
  roundTrip: {
    perKm: { hatchback: 9, sedan: 10, suv: 14, crysta: 17, tempo: 22 } satisfies PerCab,
    /** Industry standard: a day is billed at 250 km even if you travel 90. */
    minKmPerDay: 250,
    /** Driver bata — food and stay. Round trips only. */
    driverAllowancePerDay: { hatchback: 300, sedan: 300, suv: 400, crysta: 400, tempo: 600 } satisfies PerCab,
  },
  /** Added once, on any trip type, if pickup falls in the night window. */
  nightCharge: { hatchback: 300, sedan: 300, suv: 400, crysta: 400, tempo: 500 } satisfies PerCab,
  nightChargeFromHour: 22, // 10 PM
  nightChargeToHour: 6, //  6 AM
};

/** ------------------------------------------------------------------- AIRPORT
 *  Flat price per (zone, cab type) for Chhatrapati Shivaji Maharaj
 *  International Airport (BOM) — Terminal 1 Santacruz and Terminal 2 Sahar.
 *
 *  Priced against the MIAL prepaid booth and the app aggregators, because that
 *  is what a customer standing in the arrivals hall compares you with. The
 *  booth is genuinely cheap on short hops (₹350–450 to Bandra), so the money
 *  here is in the longer zones and in being pre-booked and waiting, not in
 *  beating the booth on price.
 */
export const AIRPORT_ZONES: {
  id: string;
  label: string;
  price: PerCab;
}[] = [
  {
    id: "bom_western_suburbs",
    label: "Mumbai Airport ⇄ Andheri / Bandra / Juhu",
    price: { hatchback: 450, sedan: 550, suv: 850, crysta: 1100, tempo: 1800 },
  },
  {
    id: "bom_central_suburbs",
    label: "Mumbai Airport ⇄ Powai / Ghatkopar / Chembur",
    price: { hatchback: 550, sedan: 650, suv: 950, crysta: 1200, tempo: 2000 },
  },
  {
    id: "bom_south_mumbai",
    label: "Mumbai Airport ⇄ South Mumbai (Colaba, Fort, Worli)",
    price: { hatchback: 750, sedan: 900, suv: 1300, crysta: 1600, tempo: 2500 },
  },
  {
    id: "bom_borivali",
    label: "Mumbai Airport ⇄ Borivali / Dahisar / Mira Road",
    price: { hatchback: 700, sedan: 850, suv: 1250, crysta: 1500, tempo: 2400 },
  },
  {
    id: "bom_thane",
    label: "Mumbai Airport ⇄ Thane / Mulund",
    price: { hatchback: 800, sedan: 950, suv: 1400, crysta: 1700, tempo: 2600 },
  },
  {
    id: "bom_navi_mumbai",
    label: "Mumbai Airport ⇄ Navi Mumbai (Vashi, Nerul, Belapur)",
    price: { hatchback: 850, sedan: 1000, suv: 1450, crysta: 1800, tempo: 2800 },
  },
];

/** ---------------------------------------------------------- SIGHTSEEING TOUR
 *  "Mumbai Darshan" is a named product people search for by name, not an
 *  hourly rental with a nicer label — so it gets its own trip type, its own
 *  price and, crucially, a published itinerary. The stop list is what sells it:
 *  a customer comparing two cab sites picks the one that says where it goes.
 *
 *  Beyond the included hours and km, the rental extra rates apply.
 */
export const TOUR_PACKAGES: {
  id: string;
  label: string;
  hours: number;
  km: number;
  /** Shown on the pricing page and repeated in the booking confirmation. */
  highlights: string[];
  price: PerCab;
  extraPerHour: PerCab;
  extraPerKm: PerCab;
}[] = [
  {
    id: "darshan_full_day",
    label: "Mumbai Darshan — full day",
    hours: 8,
    km: 80,
    highlights: [
      "Gateway of India",
      "Marine Drive & Nariman Point",
      "Siddhivinayak Temple",
      "Haji Ali Dargah",
      "Hanging Gardens & Kamala Nehru Park",
      "Dhobi Ghat",
      "Bandra–Worli Sea Link",
      "Juhu Beach",
    ],
    price: { hatchback: 1900, sedan: 2200, suv: 2900, crysta: 3500, tempo: 6000 },
    extraPerHour: { hatchback: 150, sedan: 170, suv: 220, crysta: 280, tempo: 400 },
    extraPerKm: { hatchback: 12, sedan: 14, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "darshan_half_day",
    label: "Mumbai Darshan — half day",
    hours: 5,
    km: 50,
    highlights: [
      "Gateway of India",
      "Marine Drive",
      "Siddhivinayak Temple",
      "Haji Ali Dargah",
      "Bandra–Worli Sea Link",
    ],
    price: { hatchback: 1250, sedan: 1450, suv: 1950, crysta: 2350, tempo: 3800 },
    extraPerHour: { hatchback: 150, sedan: 170, suv: 220, crysta: 280, tempo: 400 },
    extraPerKm: { hatchback: 12, sedan: 14, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "mumbai_by_night",
    label: "Mumbai by Night",
    hours: 4,
    km: 40,
    highlights: [
      "Marine Drive (Queen's Necklace)",
      "Bandra–Worli Sea Link",
      "Haji Ali by night",
      "Gateway of India & Colaba Causeway",
      "Juhu Beach",
    ],
    price: { hatchback: 1100, sedan: 1300, suv: 1750, crysta: 2100, tempo: 3400 },
    extraPerHour: { hatchback: 150, sedan: 170, suv: 220, crysta: 280, tempo: 400 },
    extraPerKm: { hatchback: 12, sedan: 14, suv: 17, crysta: 20, tempo: 26 },
  },
];

/** -------------------------------------------------------------------- RENTAL
 *  Hourly packages. Extra hours and extra km are charged beyond the package.
 */
export const RENTAL_PACKAGES: {
  id: string;
  label: string;
  hours: number;
  km: number;
  price: PerCab;
  extraPerHour: PerCab;
  extraPerKm: PerCab;
}[] = [
  {
    id: "4h40km",
    label: "4 hours / 40 km",
    hours: 4,
    km: 40,
    price: { hatchback: 1100, sedan: 1300, suv: 1750, crysta: 2100, tempo: 3400 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "8h80km",
    label: "8 hours / 80 km",
    hours: 8,
    km: 80,
    price: { hatchback: 1900, sedan: 2200, suv: 2800, crysta: 3300, tempo: 5500 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "12h120km",
    label: "12 hours / 120 km",
    hours: 12,
    km: 120,
    price: { hatchback: 2600, sedan: 3000, suv: 3900, crysta: 4600, tempo: 7500 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
];

/** --------------------------------------------------------------- LOCAL DROP
 *  Per-km with a minimum fare, so a 2 km hop is never quoted at ₹26.
 */
export const LOCAL = {
  perKm: { hatchback: 15, sedan: 18, suv: 23, crysta: 27, tempo: 36 } satisfies PerCab,
  minFare: { hatchback: 350, sedan: 400, suv: 550, crysta: 650, tempo: 950 } satisfies PerCab,
};

/** --------------------------------------------------------- OUTSTATION ROUTES
 *  Pre-measured one-way road distances, so customers get an instant quote with
 *  no paid maps API. A destination not listed here falls back to a
 *  customer-entered distance and the quote is flagged provisional until you
 *  confirm it — you are never bound to a number a stranger typed.
 *
 *  These are approximate. Check the ones you actually sell against your own
 *  runs before you advertise them: at ₹13/km a 20 km error is ₹260 off every
 *  quote, in whichever direction hurts.
 */
export const ROUTES: {
  from: string;
  to: string;
  km: number;
  /**
   * Flat one-way drop price, overriding the per-km formula entirely.
   *
   * Use it on busy corridors where your partner finds a return load and will
   * quote you a fixed drop rate. The formula cannot know that, so without an
   * override a Mumbai→Pune drop prices as if the car comes back empty and you
   * lose the booking to anyone quoting the real market rate.
   */
  oneWayFlat?: PerCab;
}[] = [
  // Short hops — the weekend bread and butter
  {
    from: "Mumbai",
    to: "Lonavala",
    km: 83,
    oneWayFlat: { hatchback: 1500, sedan: 1800, suv: 2250, crysta: 2850, tempo: 3600 },
  },
  { from: "Mumbai", to: "Khandala", km: 80 },
  { from: "Mumbai", to: "Matheran", km: 85 },
  {
    from: "Mumbai",
    to: "Alibaug",
    km: 100,
    oneWayFlat: { hatchback: 1900, sedan: 2300, suv: 2900, crysta: 3650, tempo: 4600 },
  },
  { from: "Mumbai", to: "Igatpuri", km: 120 },
  { from: "Mumbai", to: "Karjat", km: 65 },

  // The big one
  {
    from: "Mumbai",
    to: "Pune",
    km: 150,
    oneWayFlat: { hatchback: 1850, sedan: 2200, suv: 2750, crysta: 3500, tempo: 4400 },
  },

  // Hill stations and pilgrimage
  { from: "Mumbai", to: "Nashik", km: 165 },
  { from: "Mumbai", to: "Trimbakeshwar", km: 180 },
  { from: "Mumbai", to: "Bhimashankar", km: 215 },
  { from: "Mumbai", to: "Shirdi", km: 240 },
  { from: "Mumbai", to: "Panchgani", km: 245 },
  { from: "Mumbai", to: "Mahabaleshwar", km: 250 },
  { from: "Mumbai", to: "Lavasa", km: 200 },

  // Konkan coast
  { from: "Mumbai", to: "Murud", km: 165 },
  { from: "Mumbai", to: "Diveagar", km: 170 },
  { from: "Mumbai", to: "Ratnagiri", km: 330 },
  { from: "Mumbai", to: "Ganpatipule", km: 355 },
  { from: "Mumbai", to: "Tarkarli", km: 520 },
  { from: "Mumbai", to: "Goa", km: 590 },

  // North and inland
  { from: "Mumbai", to: "Daman", km: 175 },
  { from: "Mumbai", to: "Silvassa", km: 165 },
  { from: "Mumbai", to: "Surat", km: 285 },
  { from: "Mumbai", to: "Ahmedabad", km: 525 },
  { from: "Mumbai", to: "Aurangabad", km: 335 },
  { from: "Mumbai", to: "Kolhapur", km: 385 },
];

/**
 * Routes given their own tile on the landing page, in this order.
 * Keep this short — it is a shortcut for the trips you most want to sell,
 * not a directory. Every entry must exist in ROUTES above.
 */
export const FEATURED_ROUTES: { to: string; blurb: string }[] = [
  { to: "Pune", blurb: "Expressway, ~3 hrs" },
  { to: "Lonavala", blurb: "Weekend favourite" },
  { to: "Alibaug", blurb: "Beach getaway" },
  { to: "Shirdi", blurb: "Overnight darshan" },
  { to: "Mahabaleshwar", blurb: "Hill station" },
  { to: "Goa", blurb: "Long drive, 2 days" },
];

/** Cities you will pick up FROM. A booking outside this list is refused. */
export const SERVICE_CITIES = ["Mumbai", "Navi Mumbai", "Thane", "Panvel"];

/** ------------------------------------------------------- BOOKING GUARDRAILS
 *  Stops someone booking a 3 AM SUV, 600 km away, 20 minutes from now —
 *  a trip you take ₹500 for and then cannot deliver.
 */
export const LEAD_TIME_HOURS: PerTrip = {
  outstation_oneway: 6,
  outstation_round: 8,
  tour: 6,
  airport: 3,
  rental: 4,
  local: 2,
};

/** How far ahead bookings are accepted. */
export const MAX_ADVANCE_BOOKING_DAYS = 90;

/** ------------------------------------------------------------ ADVANCE AMOUNT
 *  RULE OF THUMB: the advance should be at least as large as your commission.
 *  The balance is collected by the driver, so anything your commission exceeds
 *  the advance by is money you have to chase your partner for, every trip.
 *
 *  `flat` is the target advance per trip type. `maxPercentOfFare` then caps it
 *  so a ₹400 local drop never asks for a ₹500 advance.
 */
export const ADVANCE = {
  flat: {
    outstation_oneway: 1000,
    outstation_round: 1500,
    tour: 750,
    airport: 500,
    rental: 500,
    local: 300,
  } satisfies PerTrip,
  /**
   * On a big trip a flat advance stops covering your commission — a ₹1,500
   * advance on a ₹23,000 Manali run leaves everything else to be collected by
   * the driver and chased back from your partner. This floor keeps the advance
   * scaling with the fare, so money only ever flows toward you.
   */
  minPercentOfFare: 0.1,
  /** Hard ceiling. Customers balk when asked for too much up front. */
  maxPercentOfFare: 0.3,
  /**
   * Never ask for less than this — below it the advance stops being a real
   * commitment and no-shows climb. But on a genuinely small fare the floor
   * itself is capped by `floorMaxPercentOfFare`, so a ₹400 local drop asks for
   * ₹200, not ₹250. Precedence: maxPercentOfFare caps the target, then the
   * floor raises it, then floorMaxPercentOfFare caps the floor.
   */
  floor: 250,
  floorMaxPercentOfFare: 0.5,
  /** Advances are rounded down to a multiple of this, so UPI amounts stay tidy. */
  roundTo: 50,
};

/**
 * Charges the customer settles on the day, on top of the quoted fare.
 *
 * Shown before payment and repeated in every confirmation — the single best
 * defence against an end-of-trip argument. Listed per trip type, because a
 * Mumbai Darshan never crosses a state border and a customer who reads
 * "state permit" on a city tour stops trusting the rest of the page.
 */
const TOLLS = "Toll charges";
const PARKING = "Parking charges";
const PERMIT = "State permit / border tax";
const ROUTE_CHANGE = "Any route change or extra km beyond the quote";
const TICKETS = "Monument entry tickets & ferry charges";

export const EXCLUSIONS_BY_TRIP: Record<TripType, string[]> = {
  outstation_oneway: [TOLLS, PERMIT, PARKING, ROUTE_CHANGE],
  outstation_round: [TOLLS, PERMIT, PARKING, ROUTE_CHANGE],
  tour: [TOLLS, PARKING, TICKETS, ROUTE_CHANGE],
  airport: [TOLLS, PARKING],
  rental: [TOLLS, PARKING, ROUTE_CHANGE],
  local: [TOLLS, PARKING],
};

/** Every charge that can ever be excluded — one source for the published terms. */
export const EXCLUSIONS = Array.from(new Set(Object.values(EXCLUSIONS_BY_TRIP).flat()));
