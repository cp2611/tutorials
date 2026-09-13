import type { Quote } from "@/lib/pricing";
import type { CabTypeId, TripType } from "@/config/fares";

/**
 * Order lifecycle.
 *
 * The important thing is where it starts: an order exists — and reaches you —
 * BEFORE any money moves. A customer who abandons at the payment screen is
 * still a lead you can call back, which is where most of the recovered revenue
 * in this model comes from.
 *
 * Only you can move a booking out of PENDING_PAYMENT, after seeing the money in
 * your own account. There is no state for "the customer says they paid",
 * because the customer's word was never evidence.
 */
export const ORDER_STATUSES = [
  "PENDING_PAYMENT", // Booked, you have been notified, advance not received yet.
  "CONFIRMED", // You saw the advance in your account. Money is real.
  "ASSIGNED", // Cab + driver details filled in; customer can see them.
  "COMPLETED", // Trip done.
  "CANCELLED", // Cancelled by either side.
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting advance payment",
  CONFIRMED: "Confirmed — arranging your cab",
  ASSIGNED: "Cab assigned",
  COMPLETED: "Trip completed",
  CANCELLED: "Cancelled",
};

export type Utm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landingPath?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;

  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  tripType: TripType;
  cabTypeId: CabTypeId;
  pickupCity?: string;
  dropCity?: string;
  pickupAddress?: string;
  dropAddress?: string;
  pickupAt?: string;
  returnAt?: string;
  passengers?: number;
  customerNotes?: string;

  /** Frozen at booking time. Editing the fare table never rewrites this. */
  quote: Quote;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  /** Exact rupee string requested over UPI, e.g. "1000.00" or "1000.37". */
  payableAmount: string;

  /** Reference you noted when you saw the advance land. Yours, not the customer's. */
  paymentReference?: string;
  paymentVerifiedAt?: string;

  /** Present from day one even though you assign partners offline. */
  providerId?: string;
  providerName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  assignedAt?: string;

  utm?: Utm;
  /** Timestamped proof the customer accepted the terms shown at checkout. */
  termsAcceptedAt?: string;
  adminNotes?: string;
  cancelledReason?: string;
};
