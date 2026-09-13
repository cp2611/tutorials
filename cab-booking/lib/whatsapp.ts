import { BUSINESS } from "@/config/business";
import { cabTypeName, inr, inrExact, istDateTime, tripTypeLabel } from "@/lib/format";
import type { Order } from "@/lib/types";

/**
 * WhatsApp is where every conversation with a customer happens, so every link
 * to it carries the booking with it.
 *
 * A customer who opens a blank chat has to explain who they are and what they
 * booked, and you have to ask. Pre-filling the message means the first thing
 * you see is the booking number, the trip and the amount — which is the whole
 * point of replacing the payment form with a chat.
 */

function tripLines(order: Order): string[] {
  const lines = [
    `${order.customerName}`,
    `${tripTypeLabel(order.tripType)} · ${cabTypeName(order.cabTypeId)}`,
  ];
  const route = [order.pickupCity, order.dropCity].filter(Boolean).join(" → ");
  if (route) lines.push(route);
  lines.push(`Pickup: ${istDateTime(order.pickupAt)}`);
  return lines;
}

function link(message: string): string {
  return `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** "I've paid" — the main call to action once the QR has been scanned. */
export function paidLink(order: Order): string {
  return link(
    [
      `Hi ${BUSINESS.brandName}, I have paid the advance for booking ${order.id}.`,
      ``,
      ...tripLines(order),
      `Advance paid: ${inrExact(order.payableAmount)}`,
      ``,
      `Please confirm and share my cab details.`,
    ].join("\n"),
  );
}

/** "I have a question" — for a customer who wants to talk before paying. */
export function questionLink(order: Order): string {
  return link(
    [
      `Hi ${BUSINESS.brandName}, I have a question about booking ${order.id}.`,
      ``,
      ...tripLines(order),
      `Total ${inr(order.totalAmount)} · Advance ${inrExact(order.payableAmount)}`,
    ].join("\n"),
  );
}

/** Generic chat link for the header and contact page, with no booking attached. */
export function generalLink(): string {
  return link(`Hi ${BUSINESS.brandName}, I'd like to book a cab.`);
}
