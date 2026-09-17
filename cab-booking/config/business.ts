/**
 * ============================================================================
 *  BUSINESS SETTINGS  —  edit this file, redeploy, done.
 *  Nothing here needs a developer. Every value is plain text or a number.
 * ============================================================================
 */

export const BUSINESS = {
  /** Shown in the header, emails, and inside the UPI payment request. */
  brandName: "RideLink Cabs",
  tagline: "Mumbai to Pune, Goa, Alibaug & Mumbai Darshan — confirmed in 2 hours",

  /** Customers see and call this. Use the number that is on WhatsApp. */
  phone: "+919000000000",
  /** Same number, digits only, country code first — used to build wa.me links. */
  whatsappNumber: "919000000000",
  email: "bookings@example.com",

  /** Required on your Contact page before any payment gateway will approve you. */
  address: "Shop 1, Example Road, Andheri East, Mumbai, Maharashtra 400069, India",
  legalEntityName: "Example Travels",

  /** Public site URL, no trailing slash. Used in emails and QR metadata. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  /**
   * UPI ID that receives the advance.
   * ⚠️  USE A MERCHANT / BUSINESS VPA, NOT YOUR PERSONAL UPI.
   * Personal UPI has a ~₹1L/day P2P cap, gets flagged by banks for
   * high-volume inbound collections, and creates an income-tax mess.
   */
  upiId: process.env.UPI_ID || "yourbusiness@okhdfcbank",
  /** Name the customer sees in their UPI app when the QR opens. */
  upiPayeeName: process.env.UPI_PAYEE_NAME || "Example Travels",

  /** How quickly you promise to send the vehicle details. Keep it honest. */
  confirmationWindowHours: 2,

  /**
   * How long before pickup the driver's personal number goes to the customer.
   *
   * Vehicle details go out as soon as the cab is assigned, because that is what
   * reassures someone who has paid. The driver's number waits: handing it over
   * days early is how a customer and a driver arrange the next trip between
   * themselves and leave you out of it.
   */
  driverContactHoursBefore: 2,

  /** Social proof shown on the landing page. Keep these truthful. */
  trustBadges: [
    "Verified drivers",
    "No hidden charges",
    "Small advance now, rest to driver",
    "Free cancellation (see policy)",
  ],
} as const;

/**
 * CANCELLATION / REFUND TERMS.
 * These numbers drive both the published policy page and the checkout notice,
 * so the text a customer agreed to always matches what the site enforces.
 */
export const REFUND_POLICY = {
  /** Cancel earlier than this many hours before pickup → full refund of advance. */
  freeCancellationHours: 12,
  /** Cancel later than that → this share of the advance is retained. */
  lateCancellationRetainedPercent: 50,
  /** Working days to process a refund back to the source UPI account. */
  refundWorkingDays: 3,
} as const;
