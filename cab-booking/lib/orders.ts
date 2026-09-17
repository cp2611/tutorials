import { randomInt } from "node:crypto";
import { BUSINESS } from "@/config/business";
import { buildQuote, validateSchedule } from "@/lib/pricing";
import { insertOrder, recentOrdersByPhone } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { payableAmount } from "@/lib/upi";
import type { Order } from "@/lib/types";
import type { CreateOrderInput } from "@/lib/validation";
import type { CabTypeId, TripType } from "@/config/fares";

/** No 0/O/1/I — booking IDs get read aloud over the phone constantly. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newBookingId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `CAB${s}`;
}

export class BookingError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

/**
 * Creates a booking in PENDING_PAYMENT.
 *
 * The order is persisted and you are notified here — before the customer has
 * seen a QR code, let alone paid. Everything after this point is upside.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.website) throw new BookingError("Submission rejected.");

  const phone = normalisePhone(input.customerPhone);
  if (!phone) throw new BookingError("Enter a valid 10-digit Indian mobile number.", "customerPhone");

  const problems = validateSchedule({
    tripType: input.tripType as TripType,
    pickupCity: input.pickupCity,
    pickupAt: input.pickupAt,
    returnAt: input.returnAt,
  });
  if (problems.length > 0) throw new BookingError(problems[0].message, problems[0].field);

  // Recomputed server-side. A price posted by the client is never trusted.
  const quote = buildQuote({
    tripType: input.tripType as TripType,
    cabTypeId: input.cabTypeId as CabTypeId,
    pickupCity: input.pickupCity,
    dropCity: input.dropCity,
    distanceKm: input.distanceKm,
    pickupAt: input.pickupAt,
    returnAt: input.returnAt,
    zoneId: input.zoneId,
    packageId: input.packageId,
  });

  // Double-tap on a slow mobile connection must not create two bookings.
  const recent = await recentOrdersByPhone(phone, 10);
  const duplicate = recent.find(
    (o) =>
      o.tripType === input.tripType &&
      o.cabTypeId === input.cabTypeId &&
      o.pickupAt === input.pickupAt &&
      o.status === "PENDING_PAYMENT",
  );
  if (duplicate) return duplicate;

  const id = newBookingId();
  const now = new Date().toISOString();

  const order: Order = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "PENDING_PAYMENT",
    customerName: input.customerName,
    customerPhone: phone,
    customerEmail: input.customerEmail || undefined,
    tripType: input.tripType as TripType,
    cabTypeId: input.cabTypeId as CabTypeId,
    pickupCity: input.pickupCity,
    dropCity: input.dropCity,
    pickupAddress: input.pickupAddress,
    dropAddress: input.dropAddress,
    pickupAt: input.pickupAt,
    returnAt: input.returnAt,
    passengers: input.passengers,
    customerNotes: input.customerNotes,
    quote,
    totalAmount: quote.total,
    advanceAmount: quote.advance,
    balanceAmount: quote.balance,
    payableAmount: payableAmount(id, quote.advance),
    utm: input.utm,
    termsAcceptedAt: now,
  };

  await insertOrder(order);
  return order;
}

/**
 * Whether the driver's personal number may be shown yet.
 *
 * The vehicle details go out the moment a cab is assigned — that is what
 * reassures a customer who has already paid. The driver's number is held back
 * until shortly before pickup, because a customer and a driver holding each
 * other's numbers a week early is how the next booking happens without you.
 */
export function driverContactReleased(order: Order, now = Date.now()): boolean {
  if (!order.pickupAt) return true;
  const pickup = new Date(order.pickupAt).getTime();
  if (!Number.isFinite(pickup)) return true;
  return now >= pickup - BUSINESS.driverContactHoursBefore * 3600_000;
}

/** Track-page access: the booking ID alone is never enough to read personal data. */
export function customerMayView(order: Order, phoneInput: string): boolean {
  const phone = normalisePhone(phoneInput);
  return Boolean(phone) && phone === order.customerPhone;
}
