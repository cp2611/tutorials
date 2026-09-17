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

export type CabTypeId =
  | "hatchback"
  | "dzire"
  | "etios"
  | "ertiga"
  | "innova"
  | "crysta"
  | "tempo"
  | "urbania";

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
  { id: "dzire", name: "Swift Dzire", seats: 4, bags: 3, examples: "Swift Dzire, Honda Amaze, Xcent" },
  { id: "etios", name: "Toyota Etios", seats: 4, bags: 4, examples: "Etios, Honda City — bigger boot" },
  { id: "ertiga", name: "Ertiga", seats: 6, bags: 3, examples: "Maruti Ertiga, Toyota Rumion, Kia Carens" },
  { id: "innova", name: "Innova", seats: 6, bags: 4, examples: "Toyota Innova" },
  { id: "crysta", name: "Innova Crysta", seats: 6, bags: 4, examples: "Toyota Innova Crysta" },
  { id: "tempo", name: "Tempo Traveller", seats: 12, bags: 12, examples: "Force Tempo Traveller 12-seater" },
  { id: "urbania", name: "Force Urbania", seats: 16, bags: 16, examples: "Force Urbania 16-seater" },
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
    perKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 17, crysta: 19, tempo: 24, urbania: 28 } satisfies PerCab,
    /** Very short drops still cost the operator a full trip out and back. */
    minKm: 130,
  },
  roundTrip: {
    perKm: { hatchback: 10, dzire: 11, etios: 12, ertiga: 14, innova: 16, crysta: 18, tempo: 22, urbania: 26 } satisfies PerCab,
    /** Industry standard: a day is billed at 250 km even if you travel 90. */
    minKmPerDay: 250,
    /** Driver bata — food and stay. Round trips only. */
    driverAllowancePerDay: { hatchback: 300, dzire: 300, etios: 300, ertiga: 350, innova: 400, crysta: 400, tempo: 500, urbania: 600 } satisfies PerCab,
  },
  /**
   * Added once, on any trip type, when pickup falls in the night window.
   * Operators publish either a flat ₹200–300 or a 10–25% surcharge; a flat
   * figure is used here because it survives being read aloud over the phone.
   */
  nightCharge: { hatchback: 200, dzire: 250, etios: 250, ertiga: 300, innova: 300, crysta: 350, tempo: 400, urbania: 500 } satisfies PerCab,
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
    price: { hatchback: 450, dzire: 550, etios: 600, ertiga: 700, innova: 800, crysta: 900, tempo: 1500, urbania: 1900 },
  },
  {
    id: "bom_central_suburbs",
    label: "Mumbai Airport ⇄ Powai / Ghatkopar / Chembur",
    price: { hatchback: 550, dzire: 650, etios: 700, ertiga: 800, innova: 900, crysta: 1050, tempo: 1700, urbania: 2150 },
  },
  {
    id: "bom_south_mumbai",
    label: "Mumbai Airport ⇄ South Mumbai (Colaba, Fort, Worli)",
    price: { hatchback: 750, dzire: 875, etios: 950, ertiga: 1100, innova: 1250, crysta: 1400, tempo: 2200, urbania: 2800 },
  },
  {
    id: "bom_borivali",
    label: "Mumbai Airport ⇄ Borivali / Dahisar / Mira Road",
    price: { hatchback: 700, dzire: 825, etios: 900, ertiga: 1050, innova: 1200, crysta: 1350, tempo: 2100, urbania: 2650 },
  },
  {
    id: "bom_thane",
    label: "Mumbai Airport ⇄ Thane / Mulund",
    price: { hatchback: 800, dzire: 950, etios: 1025, ertiga: 1150, innova: 1300, crysta: 1500, tempo: 2350, urbania: 2950 },
  },
  {
    id: "bom_navi_mumbai",
    label: "Mumbai Airport ⇄ Navi Mumbai (Vashi, Nerul, Belapur)",
    price: { hatchback: 850, dzire: 1000, etios: 1075, ertiga: 1250, innova: 1400, crysta: 1600, tempo: 2500, urbania: 3150 },
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
  /**
   * The published running order. Times assume a standard morning start and
   * shift with the customer's actual pickup — they are shown so a customer can
   * picture the day, not as a contract.
   */
  itinerary: { time: string; place: string }[];
  price: PerCab;
  extraPerHour: PerCab;
  extraPerKm: PerCab;
}[] = [
  {
    id: "darshan_full_day",
    label: "Mumbai Darshan — full day",
    // 8 AM to 10 PM is a fourteen-hour day. Priced as one, so nobody is handed
    // six hours of overage at midnight.
    hours: 14,
    km: 140,
    itinerary: [
      { time: "8:00–9:00", place: "Siddhivinayak Temple" },
      { time: "9:15–10:00", place: "Breakfast" },
      { time: "10:30–11:15", place: "CSMT" },
      { time: "11:15–12:00", place: "Fort, Flora Fountain & Horniman Circle" },
      { time: "12:15–1:15", place: "Gateway of India" },
      { time: "1:15–2:00", place: "Colaba Causeway" },
      { time: "2:00–3:00", place: "Lunch" },
      { time: "3:15–4:00", place: "Kala Ghoda / CSMVS" },
      { time: "4:15–5:00", place: "Hanging Gardens / Malabar Hill" },
      { time: "5:15–6:30", place: "Marine Drive + Chowpatty" },
      { time: "6:45–7:15", place: "Worli Sea Face" },
      { time: "7:15–7:45", place: "Bandra–Worli Sea Link" },
      { time: "8:00–8:45", place: "Bandra Bandstand" },
      { time: "9:00–10:00", place: "Juhu + dinner" },
    ],
    price: { hatchback: 2850, dzire: 3300, etios: 3600, ertiga: 4050, innova: 4500, crysta: 5100, tempo: 8250, urbania: 10500 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
  },
  {
    id: "darshan_half_day",
    label: "Mumbai Darshan — half day",
    hours: 5,
    km: 50,
    itinerary: [
      { time: "8:00–9:00", place: "Siddhivinayak Temple" },
      { time: "9:30–10:15", place: "CSMT" },
      { time: "10:15–11:00", place: "Fort, Flora Fountain & Horniman Circle" },
      { time: "11:15–12:15", place: "Gateway of India" },
      { time: "12:15–1:00", place: "Colaba Causeway" },
    ],
    price: { hatchback: 1250, dzire: 1450, etios: 1550, ertiga: 1750, innova: 1950, crysta: 2200, tempo: 3600, urbania: 4600 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
  },
  {
    id: "mumbai_by_night",
    label: "Mumbai by Night",
    hours: 4,
    km: 40,
    itinerary: [
      { time: "6:00–6:30", place: "Worli Sea Face" },
      { time: "6:30–7:00", place: "Bandra–Worli Sea Link" },
      { time: "7:15–8:00", place: "Bandra Bandstand" },
      { time: "8:15–9:00", place: "Marine Drive + Chowpatty" },
      { time: "9:00–10:00", place: "Juhu Beach + dinner" },
    ],
    price: { hatchback: 1100, dzire: 1300, etios: 1400, ertiga: 1550, innova: 1750, crysta: 1950, tempo: 3200, urbania: 4100 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
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
    price: { hatchback: 1150, dzire: 1350, etios: 1450, ertiga: 1650, innova: 1850, crysta: 2100, tempo: 3400, urbania: 4300 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
  },
  {
    id: "8h80km",
    label: "8 hours / 80 km",
    hours: 8,
    km: 80,
    price: { hatchback: 2050, dzire: 2400, etios: 2600, ertiga: 2900, innova: 3250, crysta: 3650, tempo: 5900, urbania: 7500 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
  },
  {
    id: "12h120km",
    label: "12 hours / 120 km",
    hours: 12,
    km: 120,
    price: { hatchback: 2800, dzire: 3300, etios: 3550, ertiga: 4000, innova: 4450, crysta: 5000, tempo: 8100, urbania: 10300 },
    extraPerHour: { hatchback: 150, dzire: 175, etios: 175, ertiga: 200, innova: 200, crysta: 250, tempo: 350, urbania: 450 },
    extraPerKm: { hatchback: 11, dzire: 13, etios: 14, ertiga: 15, innova: 16, crysta: 18, tempo: 24, urbania: 28 },
  },
];

/** --------------------------------------------------------------- LOCAL DROP
 *  Per-km with a minimum fare, so a 2 km hop is never quoted at ₹26.
 */
export const LOCAL = {
  perKm: { hatchback: 14, dzire: 17, etios: 18, ertiga: 21, innova: 24, crysta: 27, tempo: 34, urbania: 40 } satisfies PerCab,
  minFare: { hatchback: 350, dzire: 400, etios: 450, ertiga: 550, innova: 650, crysta: 750, tempo: 1100, urbania: 1400 } satisfies PerCab,
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
    oneWayFlat: { hatchback: 1650, dzire: 1950, etios: 2100, ertiga: 2250, innova: 2550, crysta: 2850, tempo: 3600, urbania: 4200 },
  },
  { from: "Mumbai", to: "Khandala", km: 80 },
  { from: "Mumbai", to: "Matheran", km: 85 },
  {
    from: "Mumbai",
    to: "Alibaug",
    km: 100,
    oneWayFlat: { hatchback: 2450, dzire: 2900, etios: 3100, ertiga: 3350, innova: 3800, crysta: 4250, tempo: 5350, urbania: 6250 },
  },
  { from: "Mumbai", to: "Igatpuri", km: 120 },
  { from: "Mumbai", to: "Karjat", km: 65 },

  // The big one
  {
    from: "Mumbai",
    to: "Pune",
    km: 150,
    oneWayFlat: { hatchback: 1950, dzire: 2300, etios: 2500, ertiga: 2650, innova: 3000, crysta: 3350, tempo: 4250, urbania: 4950 },
  },

  // Hill stations and pilgrimage
  { from: "Mumbai", to: "Nashik", km: 165 },
  { from: "Mumbai", to: "Trimbakeshwar", km: 180 },
  { from: "Mumbai", to: "Bhimashankar", km: 215 },
  {
    from: "Mumbai",
    to: "Shirdi",
    km: 240,
    oneWayFlat: { hatchback: 2550, dzire: 3000, etios: 3250, ertiga: 3450, innova: 3900, crysta: 4400, tempo: 5550, urbania: 6450 },
  },
  { from: "Mumbai", to: "Panchgani", km: 245 },
  {
    from: "Mumbai",
    to: "Mahabaleshwar",
    km: 250,
    oneWayFlat: { hatchback: 3050, dzire: 3600, etios: 3900, ertiga: 4150, innova: 4700, crysta: 5250, tempo: 6650, urbania: 7750 },
  },
  { from: "Mumbai", to: "Lavasa", km: 200 },

  // Konkan coast
  { from: "Mumbai", to: "Murud", km: 165 },
  { from: "Mumbai", to: "Diveagar", km: 170 },
  { from: "Mumbai", to: "Ratnagiri", km: 330 },
  { from: "Mumbai", to: "Ganpatipule", km: 355 },
  { from: "Mumbai", to: "Tarkarli", km: 520 },
  {
    from: "Mumbai",
    to: "Goa",
    km: 590,
    oneWayFlat: { hatchback: 7550, dzire: 8900, etios: 9600, ertiga: 10250, innova: 11650, crysta: 13000, tempo: 16450, urbania: 19150 },
  },

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

/**
 * Cities you will pick up FROM. A booking from anywhere else is refused.
 *
 * Flip `enabled` to open or close a city — no other change needed. Keeping the
 * disabled ones listed rather than deleting them means turning one back on is a
 * one-word edit when you have the partner coverage for it.
 *
 * The measured distances in ROUTES are all from Mumbai. A pickup elsewhere in
 * the metropolitan region still quotes instantly off those numbers, but the
 * quote is flagged as approximate and confirmed before pickup — Thane to Pune
 * is genuinely shorter than Mumbai to Pune.
 */
export const SERVICE_CITY_OPTIONS: { name: string; enabled: boolean }[] = [
  { name: "Mumbai", enabled: true },
  { name: "Thane", enabled: true },
  { name: "Navi Mumbai", enabled: false },
  { name: "Panvel", enabled: false },
  { name: "Kalyan", enabled: false },
  { name: "Vasai-Virar", enabled: false },
];

/** The live list. Everything in the app reads this, never the options above. */
export const SERVICE_CITIES = SERVICE_CITY_OPTIONS.filter((c) => c.enabled).map((c) => c.name);

/** Distances in ROUTES are measured from here. */
export const ROUTE_ORIGIN = "Mumbai";

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
