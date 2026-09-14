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
  | "airport"
  | "rental"
  | "local";

export const TRIP_TYPES: { id: TripType; label: string; blurb: string }[] = [
  { id: "outstation_oneway", label: "Outstation one-way", blurb: "City to city, drop only" },
  { id: "outstation_round", label: "Outstation round trip", blurb: "Return journey, multi-day" },
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
 *  Billed as: per-km rate × chargeable km, plus a driver allowance per day.
 *  Chargeable km respects an industry-standard daily minimum — a round trip
 *  that covers only 90 km still bills the 250 km minimum for that day.
 */
export const OUTSTATION = {
  perKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 } satisfies PerCab,
  /** Driver bata, per calendar day of the trip. */
  driverAllowancePerDay: { hatchback: 300, sedan: 300, suv: 400, crysta: 400, tempo: 600 } satisfies PerCab,
  /** One-way trips bill at least this many km (covers the driver's return leg). */
  minKmOneWay: 130,
  /** Round trips bill at least this many km per day. */
  minKmPerDay: 250,
  /** Added once if pickup is between nightChargeFrom and nightChargeTo. */
  nightCharge: { hatchback: 300, sedan: 300, suv: 400, crysta: 400, tempo: 500 } satisfies PerCab,
  nightChargeFromHour: 22, // 10 PM
  nightChargeToHour: 6, //  6 AM
};

/** ------------------------------------------------------------------- AIRPORT
 *  Flat price per (zone, cab type). Add your own zones freely.
 */
export const AIRPORT_ZONES: {
  id: string;
  label: string;
  price: PerCab;
}[] = [
  {
    id: "igi_central_delhi",
    label: "IGI Airport ⇄ Central Delhi",
    price: { hatchback: 900, sedan: 1100, suv: 1600, crysta: 1900, tempo: 2800 },
  },
  {
    id: "igi_gurgaon",
    label: "IGI Airport ⇄ Gurgaon",
    price: { hatchback: 1000, sedan: 1200, suv: 1700, crysta: 2000, tempo: 3000 },
  },
  {
    id: "igi_noida",
    label: "IGI Airport ⇄ Noida",
    price: { hatchback: 1300, sedan: 1500, suv: 2100, crysta: 2400, tempo: 3400 },
  },
  {
    id: "igi_ghaziabad",
    label: "IGI Airport ⇄ Ghaziabad",
    price: { hatchback: 1500, sedan: 1700, suv: 2300, crysta: 2600, tempo: 3700 },
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
    price: { hatchback: 1100, sedan: 1300, suv: 1900, crysta: 2300, tempo: 3200 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "8h80km",
    label: "8 hours / 80 km",
    hours: 8,
    km: 80,
    price: { hatchback: 1900, sedan: 2200, suv: 3100, crysta: 3700, tempo: 5200 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
  {
    id: "12h120km",
    label: "12 hours / 120 km",
    hours: 12,
    km: 120,
    price: { hatchback: 2700, sedan: 3100, suv: 4300, crysta: 5100, tempo: 7000 },
    extraPerHour: { hatchback: 150, sedan: 180, suv: 250, crysta: 300, tempo: 400 },
    extraPerKm: { hatchback: 11, sedan: 13, suv: 17, crysta: 20, tempo: 26 },
  },
];

/** --------------------------------------------------------------- LOCAL DROP
 *  Per-km with a minimum fare, so a 2 km hop is never quoted at ₹26.
 */
export const LOCAL = {
  perKm: { hatchback: 16, sedan: 19, suv: 24, crysta: 28, tempo: 36 } satisfies PerCab,
  minFare: { hatchback: 350, sedan: 400, suv: 550, crysta: 650, tempo: 900 } satisfies PerCab,
};

/** --------------------------------------------------------- OUTSTATION ROUTES
 *  Pre-measured routes so customers get an instant, accurate quote with no
 *  paid maps API. "Other city" falls back to a customer-entered distance and
 *  the quote is flagged as provisional until you confirm it.
 */
export const ROUTES: { from: string; to: string; km: number }[] = [
  { from: "Delhi", to: "Jaipur", km: 280 },
  { from: "Delhi", to: "Agra", km: 233 },
  { from: "Delhi", to: "Chandigarh", km: 245 },
  { from: "Delhi", to: "Dehradun", km: 255 },
  { from: "Delhi", to: "Rishikesh", km: 240 },
  { from: "Delhi", to: "Manali", km: 537 },
  { from: "Delhi", to: "Shimla", km: 343 },
  { from: "Delhi", to: "Haridwar", km: 220 },
  { from: "Delhi", to: "Amritsar", km: 450 },
  { from: "Delhi", to: "Lucknow", km: 555 },
  { from: "Delhi", to: "Mathura", km: 180 },
  { from: "Delhi", to: "Nainital", km: 300 },
  { from: "Delhi", to: "Mussoorie", km: 290 },
  { from: "Delhi", to: "Jim Corbett", km: 260 },
  { from: "Delhi", to: "Ayodhya", km: 680 },
  { from: "Delhi", to: "Varanasi", km: 820 },
];

/** Cities you will pick up FROM. A booking outside this list is refused. */
export const SERVICE_CITIES = ["Delhi", "Gurgaon", "Noida", "Ghaziabad", "Faridabad"];

/** ------------------------------------------------------- BOOKING GUARDRAILS
 *  Stops someone booking a 3 AM SUV, 600 km away, 20 minutes from now —
 *  a trip you take ₹500 for and then cannot deliver.
 */
export const LEAD_TIME_HOURS: PerTrip = {
  outstation_oneway: 6,
  outstation_round: 8,
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
 * Charges the customer pays the DRIVER directly, on top of the quoted fare.
 * This list is shown before payment and repeated in every confirmation —
 * it is the single best defence against end-of-trip fare disputes.
 */
export const EXCLUSIONS = [
  "Toll charges",
  "State permit / border tax",
  "Parking charges",
  "Any route change or extra km beyond the quote",
];
