/**
 * Cheap signals that a submission is not a real customer.
 *
 * Deliberately no OTP: every extra step costs real bookings from a paid ad
 * click, and the goal here is to keep junk out of the inbox and load off the
 * server — not to prove identity. Anything a determined person can bypass by
 * hand is fine, because doing it by hand is not an attack.
 */

/** Numbers nobody actually has. Catches lazy junk without touching real ones. */
export function looksLikeFakePhone(tenDigits: string): boolean {
  if (/^(\d)\1{9}$/.test(tenDigits)) return true; // 9999999999
  if ("0123456789".includes(tenDigits)) return true; // sequential run
  if ("9876543210".includes(tenDigits)) return true; // descending run
  if (/^(\d{2})\1{4}$/.test(tenDigits)) return true; // 9898989898
  return false;
}

/**
 * A human cannot read a fare table, choose a car and type their details in
 * under a couple of seconds. A script does it instantly.
 */
export const MIN_FORM_FILL_MS = 4000;
/** Older than this and the timestamp is stale or forged; ignore rather than reject. */
export const MAX_FORM_AGE_MS = 6 * 60 * 60 * 1000;

export function filledTooFast(formLoadedAt: number | undefined, now = Date.now()): boolean {
  if (!formLoadedAt || !Number.isFinite(formLoadedAt)) return false;
  const elapsed = now - formLoadedAt;
  if (elapsed < 0 || elapsed > MAX_FORM_AGE_MS) return false;
  return elapsed < MIN_FORM_FILL_MS;
}

/** Free-text fields are where link spam lands. Customers do not send URLs. */
export function containsLinkSpam(text: string | undefined): boolean {
  if (!text) return false;
  return /(https?:\/\/|www\.|\[url=|<a\s|\bt\.me\/|\bbit\.ly\/)/i.test(text);
}
