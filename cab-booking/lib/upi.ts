import QRCode from "qrcode";
import { BUSINESS } from "@/config/business";

/**
 * Optional reconciliation aid. When on, each booking's advance gets a unique
 * paise value (₹500.37, ₹500.82 …) derived from its booking ID. Your bank SMS
 * then identifies the booking from the AMOUNT ALONE, with no gateway and no
 * dependence on whether your bank shows the UPI remark in the statement.
 *
 * Trade-off: customers see an odd amount. Off by default; turn on with
 * UPI_UNIQUE_PAISE=true once you are doing enough volume for names to collide.
 */
const UNIQUE_PAISE = process.env.UPI_UNIQUE_PAISE === "true";

/** Stable 1..99 paise derived from the booking ID. */
function paiseFor(bookingId: string): number {
  let h = 0;
  for (const ch of bookingId) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % 99) + 1;
}

/**
 * The exact rupee amount to request, as a string with two decimals.
 * This is what goes into the QR and what you should expect in your bank SMS.
 */
export function payableAmount(bookingId: string, advance: number): string {
  if (!UNIQUE_PAISE) return advance.toFixed(2);
  return (advance + paiseFor(bookingId) / 100).toFixed(2);
}

/**
 * Builds a UPI *intent* string rather than relying on a static printed QR.
 *
 * Why this matters: a static QR carries no amount and no reference, so the
 * customer types the amount themselves (₹50 instead of ₹500 is routine) and
 * nothing ties the payment to a booking. Here the amount is pre-filled and the
 * booking ID travels in both `tn` (remark) and `tr` (transaction reference),
 * so it lands in your statement narration and reconciliation is a lookup
 * instead of a guess.
 */
export function buildUpiUri(bookingId: string, advance: number): string {
  const params = new URLSearchParams({
    pa: BUSINESS.upiId,
    pn: BUSINESS.upiPayeeName,
    am: payableAmount(bookingId, advance),
    cu: "INR",
    tn: `Advance ${bookingId}`,
    tr: bookingId,
  });
  return `upi://pay?${params.toString()}`;
}

/** PNG data URL of the UPI intent, rendered server-side so the page needs no JS. */
export async function buildUpiQrDataUrl(bookingId: string, advance: number): Promise<string> {
  return QRCode.toDataURL(buildUpiUri(bookingId, advance), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
