import { findOrderByUtr, findOrdersAwaitingAmount, updateOrder } from "@/lib/db";
import type { ParsedCredit } from "@/lib/bankAlert";
import type { Order } from "@/lib/types";

/** How far back a credit may be matched against an open booking. */
const MATCH_WINDOW_DAYS = 7;

export type ReconcileResult =
  | { outcome: "confirmed"; order: Order }
  | { outcome: "duplicate"; order: Order }
  | { outcome: "no-match"; credit: ParsedCredit }
  | { outcome: "ambiguous"; credit: ParsedCredit; candidates: Order[] };

/**
 * Attaches a credit that landed in your bank account to the booking that was
 * waiting for it, and confirms that booking outright.
 *
 * Confirming here is safe in a way that confirming on a customer-typed UTR
 * never was: the evidence is your own bank's alert, not the customer's word.
 *
 * Anything less than exactly one match is deliberately NOT auto-confirmed —
 * the owner is alerted and confirms by hand from the admin panel. Money that
 * cannot be placed is a question for a person, not a guess.
 */
export async function reconcileCredit(credit: ParsedCredit): Promise<ReconcileResult> {
  // Bank alerts get re-delivered — by an SMS forwarder retrying, or by the same
  // notification arriving over both SMS and email. Never process one twice.
  if (credit.reference) {
    const existing = await findOrderByUtr(credit.reference);
    if (existing) return { outcome: "duplicate", order: existing };
  }

  const candidates = await findOrdersAwaitingAmount(credit.amount, MATCH_WINDOW_DAYS);

  if (candidates.length === 0) return { outcome: "no-match", credit };
  if (candidates.length > 1) return { outcome: "ambiguous", credit, candidates };

  const now = new Date().toISOString();
  const updated = await updateOrder(candidates[0].id, {
    status: "CONFIRMED",
    paymentUtr: credit.reference ?? candidates[0].paymentUtr,
    paymentClaimedAt: candidates[0].paymentClaimedAt ?? now,
    paymentVerifiedAt: now,
    adminNotes: appendNote(
      candidates[0].adminNotes,
      `Auto-confirmed from bank alert: ₹${credit.amount}${
        credit.reference ? ` · ref ${credit.reference}` : ""
      }${credit.payer ? ` · from ${credit.payer}` : ""}`,
    ),
  });

  return updated
    ? { outcome: "confirmed", order: updated }
    : { outcome: "no-match", credit };
}

function appendNote(existing: string | undefined, line: string): string {
  return existing ? `${existing}\n${line}` : line;
}
