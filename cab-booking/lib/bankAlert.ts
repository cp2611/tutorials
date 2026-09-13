/**
 * Parses a bank credit alert — an SMS or an email body — into a structured
 * payment.
 *
 * This is what removes the UTR box from the customer's screen. A browser can
 * never learn that a UPI payment succeeded: the `upi://` handoff returns its
 * result to the Android app that launched it, and a web page gets no callback
 * without a payment service provider. But the money lands in YOUR account, and
 * your bank tells YOU within seconds. Feeding that alert back into the site
 * turns verification from "the customer typed a number" into "the bank said so".
 *
 * Alert formats vary by bank and change without notice, so this is deliberately
 * tolerant about shape and strict about meaning: find an amount, find a
 * reference, and refuse anything not unambiguously a credit.
 */

export type ParsedCredit = {
  /** Rupees with exactly two decimals, e.g. "1000.37" — matches Order.payableAmount. */
  amount: string;
  /** UPI reference / UTR / RRN, when the alert includes one. */
  reference?: string;
  /** Payer name, when the alert includes one. Advisory, for manual matching. */
  payer?: string;
  raw: string;
};

export type ParseFailure = { reason: "not-a-credit" | "no-amount" };

/**
 * Words that mean money arrived. At least one must be present.
 * Bare "credit" is deliberately absent — it would match "credit card".
 */
const CREDIT_WORDS = /\b(credited|received|deposited)\b|\bcredit of\b|\badded to\b/i;

/**
 * Words that mean money did NOT arrive. Any of these vetoes the alert.
 * Vetoing beats matching: a missed auto-confirm falls back to the manual path,
 * whereas a false one gives away a free cab.
 */
const DEBIT_WORDS =
  /\b(debited|debit|withdrawn|spent|paid to|sent to|purchase|declined|failed|reversed)\b|\bcredit card\b/i;

const CURRENCY = String.raw`(?:rs\.?|inr|₹)`;
/** One figure, commas allowed anywhere: "1,000.37", "1000.37", "500". */
const AMOUNT = String.raw`[0-9][0-9,]*(?:\.[0-9]{1,2})?`;

/**
 * A credit SMS almost always also quotes the available balance, so the first
 * rupee figure in the string is not safe to take. Prefer the figure sitting
 * next to the credit word — in either order — and only then fall back.
 */
const AMOUNT_PATTERNS = [
  new RegExp(`${CURRENCY}\\s*(${AMOUNT})\\s*(?:is\\s+|has\\s+been\\s+)?(?:credited|received|deposited)`, "i"),
  new RegExp(`(?:credited|received|deposited)(?:\\s+\\w+){0,3}?\\s*${CURRENCY}\\s*(${AMOUNT})`, "i"),
  new RegExp(`${CURRENCY}\\s*(${AMOUNT})`, "i"),
];

function extractAmount(raw: string): string | null {
  for (const re of AMOUNT_PATTERNS) {
    const m = raw.match(re);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n.toFixed(2);
  }
  return null;
}

/**
 * Tried in order of how specific the label is. UPI references are 12 digits in
 * practice; RRNs and bank-specific refs can be longer and carry letters.
 */
const REFERENCE_PATTERNS = [
  /(?:utr|rrn)\s*(?:no\.?)?\s*[:.#-]*\s*([A-Za-z0-9]{9,25})/i,
  /(?:ref(?:erence)?|txn|transaction)\s*(?:no\.?|id)?\s*[:.#-]*\s*([A-Za-z0-9]{9,25})/i,
  // "UPI/P2M/412345678901/ANITA" and "UPI:412345678901".
  /upi[:/]\s*(?:[A-Za-z0-9]{1,8}[/\s-]+)*?([0-9]{9,25})/i,
  /\b([0-9]{12})\b/,
];

/** A reference is mostly digits. This rejects captures like the word "Transaction". */
function looksLikeReference(candidate: string): boolean {
  return (candidate.match(/[0-9]/g)?.length ?? 0) >= 8;
}

function extractReference(raw: string): string | undefined {
  for (const re of REFERENCE_PATTERNS) {
    const m = raw.match(re);
    if (m && looksLikeReference(m[1])) return m[1];
  }
  return undefined;
}

/** Words that follow a payer name in bank SMS and must not be read as part of it. */
const NOT_NAME_WORDS = /^(ref|refno|no|utr|rrn|on|upi|txn|transaction|avl|bal|id|via|dated|a|ac|the|your)$/i;

const PAYER_PATTERNS = [
  /(?:trf\s+from|from|by|frm)\s+([A-Za-z][A-Za-z.]*(?:\s+[A-Za-z][A-Za-z.]*){0,3})/,
  /\/([A-Z][A-Z\s]{2,30}?)(?:\/|$)/,
];

function extractPayer(raw: string): string | undefined {
  for (const re of PAYER_PATTERNS) {
    const m = raw.match(re);
    if (!m) continue;
    const words = m[1].trim().split(/\s+/);
    while (words.length > 0 && NOT_NAME_WORDS.test(words[words.length - 1])) words.pop();
    const name = words.join(" ").trim();
    if (name.length > 2 && !NOT_NAME_WORDS.test(name)) return name;
  }
  return undefined;
}

export function parseBankAlert(text: string): ParsedCredit | ParseFailure {
  const raw = text.trim();
  if (!raw) return { reason: "no-amount" };

  // A debit veto beats a credit word appearing anywhere in the message.
  if (DEBIT_WORDS.test(raw)) return { reason: "not-a-credit" };
  if (!CREDIT_WORDS.test(raw)) return { reason: "not-a-credit" };

  const amount = extractAmount(raw);
  if (!amount) return { reason: "no-amount" };

  return { amount, reference: extractReference(raw), payer: extractPayer(raw), raw };
}

export function isParseFailure(r: ParsedCredit | ParseFailure): r is ParseFailure {
  return "reason" in r;
}
