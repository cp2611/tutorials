import { BUSINESS } from "@/config/business";
import { cabTypeName, escapeHtml, inr, inrExact, istDateTime, tripTypeLabel } from "@/lib/format";
import type { Order } from "@/lib/types";

/**
 * Notifications are ALWAYS best-effort and never block an order.
 *
 * The order is written to the database first; alerts go out after. A dropped
 * Telegram message or a bounced email must never mean a paid customer who
 * doesn't exist in your system — that is what the admin panel is for.
 */

export type NotifyResult = { channel: string; ok: boolean; error?: string };

const timeout = (ms: number) => AbortSignal.timeout(ms);

/* ----------------------------------------------------------------- Telegram */

async function sendTelegram(text: string): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { channel: "telegram", ok: false, error: "not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: timeout(8000),
    });
    if (!res.ok) return { channel: "telegram", ok: false, error: `HTTP ${res.status}` };
    return { channel: "telegram", ok: true };
  } catch (e) {
    return { channel: "telegram", ok: false, error: String(e) };
  }
}

/* -------------------------------------------------------------------- Email */

async function sendEmail(to: string, subject: string, html: string): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { channel: `email:${to}`, ok: false, error: "not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
      signal: timeout(10000),
    });
    if (!res.ok) {
      return { channel: `email:${to}`, ok: false, error: `HTTP ${res.status} ${await res.text()}` };
    }
    return { channel: `email:${to}`, ok: true };
  } catch (e) {
    return { channel: `email:${to}`, ok: false, error: String(e) };
  }
}

/* ----------------------------------------------------------------- WhatsApp */

/**
 * WhatsApp Cloud API, off until you finish Meta business verification and get
 * your message templates approved. Everything else works without it — this is
 * deliberately the only channel that can be missing at launch.
 */
async function sendWhatsApp(toPhone: string, templateName: string, params: string[]): Promise<NotifyResult> {
  if (process.env.WHATSAPP_ENABLED !== "true") {
    return { channel: "whatsapp", ok: false, error: "disabled" };
  }
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { channel: "whatsapp", ok: false, error: "not configured" };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
          ],
        },
      }),
      signal: timeout(10000),
    });
    if (!res.ok) {
      return { channel: "whatsapp", ok: false, error: `HTTP ${res.status} ${await res.text()}` };
    }
    return { channel: "whatsapp", ok: true };
  } catch (e) {
    return { channel: "whatsapp", ok: false, error: String(e) };
  }
}

/* ------------------------------------------------------------ Message bodies */

function tripSummaryLines(o: Order): string[] {
  const lines = [
    `Trip: ${tripTypeLabel(o.tripType)} · ${cabTypeName(o.cabTypeId)}`,
    `Pickup: ${istDateTime(o.pickupAt)}`,
  ];
  if (o.returnAt) lines.push(`Return: ${istDateTime(o.returnAt)}`);
  if (o.pickupAddress) lines.push(`From: ${o.pickupAddress}`);
  if (o.dropAddress) lines.push(`To: ${o.dropAddress}`);
  else if (o.dropCity) lines.push(`To: ${o.dropCity}`);
  if (o.passengers) lines.push(`Passengers: ${o.passengers}`);
  if (o.customerNotes) lines.push(`Note: ${o.customerNotes}`);
  return lines;
}

function ownerTelegramText(o: Order, heading: string): string {
  const utm = o.utm ?? {};
  const campaign = [utm.source, utm.medium, utm.campaign].filter(Boolean).join(" / ");
  return [
    `<b>${escapeHtml(heading)}</b>`,
    `<b>${escapeHtml(o.id)}</b>`,
    "",
    `👤 ${escapeHtml(o.customerName)}`,
    `📞 <a href="tel:+91${o.customerPhone}">+91 ${o.customerPhone}</a> · <a href="https://wa.me/91${o.customerPhone}">WhatsApp</a>`,
    o.customerEmail ? `✉️ ${escapeHtml(o.customerEmail)}` : "",
    "",
    ...tripSummaryLines(o).map((l) => escapeHtml(l)),
    "",
    `💰 Total ${inr(o.totalAmount)} · Advance ${inrExact(o.payableAmount)} · Balance to driver ${inr(o.balanceAmount)}`,
    o.paymentVerifiedAt ? "✅ Advance received" : "⏳ Advance not received yet",
    campaign ? `📣 ${escapeHtml(campaign)}` : "",
    "",
    `<a href="${BUSINESS.siteUrl}/admin/orders/${o.id}">Open in admin →</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function ownerEmailHtml(o: Order, heading: string): string {
  const rows = [
    ["Booking ID", o.id],
    ["Status", o.status],
    ["Customer", `${o.customerName} · +91 ${o.customerPhone}${o.customerEmail ? ` · ${o.customerEmail}` : ""}`],
    ...tripSummaryLines(o).map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
    ["Total", inr(o.totalAmount)],
    ["Advance requested", inrExact(o.payableAmount)],
    ["Balance to driver", inr(o.balanceAmount)],
    ["Advance", o.paymentVerifiedAt ? "Received" : "Not received yet"],
    ["Campaign", [o.utm?.source, o.utm?.medium, o.utm?.campaign].filter(Boolean).join(" / ") || "direct"],
  ];
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:620px">
      <h2 style="margin:0 0 4px">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 16px;color:#555">Booking <strong>${escapeHtml(o.id)}</strong></p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="border-bottom:1px solid #eee;color:#666;width:38%">${escapeHtml(String(k))}</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(String(v))}</strong></td></tr>`,
          )
          .join("")}
      </table>
      <p style="margin-top:20px">
        <a href="${BUSINESS.siteUrl}/admin/orders/${o.id}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open in admin</a>
      </p>
    </div>`;
}

function customerEmailHtml(o: Order): string {
  const confirmed = o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED";
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:620px">
      <h2 style="margin:0 0 4px">Booking ${escapeHtml(o.id)}</h2>
      <p style="margin:0 0 16px;color:#555">
        Thanks ${escapeHtml(o.customerName)} — we have your request.
        ${
          confirmed
            ? `Your advance is received. We will send your cab and driver details within ${BUSINESS.confirmationWindowHours} hours.`
            : `Your booking is held but <strong>not confirmed until the advance is paid</strong>. Pay on your booking page, then message us on WhatsApp.`
        }
      </p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">
        ${tripSummaryLines(o)
          .map((l) => {
            const i = l.indexOf(":");
            return `<tr><td style="border-bottom:1px solid #eee;color:#666;width:38%">${escapeHtml(l.slice(0, i))}</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(l.slice(i + 1).trim())}</strong></td></tr>`;
          })
          .join("")}
        <tr><td style="border-bottom:1px solid #eee;color:#666">Total fare</td><td style="border-bottom:1px solid #eee"><strong>${inr(o.totalAmount)}</strong></td></tr>
        <tr><td style="border-bottom:1px solid #eee;color:#666">Advance</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(inrExact(o.payableAmount))}</strong></td></tr>
        <tr><td style="border-bottom:1px solid #eee;color:#666">Pay to driver at drop</td><td style="border-bottom:1px solid #eee"><strong>${inr(o.balanceAmount)}</strong></td></tr>
      </table>
      <p style="margin-top:16px;font-size:13px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:10px 12px;border-radius:6px">
        <strong>Payable directly to the driver, over and above the fare:</strong><br>
        ${o.quote.exclusions.map(escapeHtml).join(" · ")}
      </p>
      <p style="margin-top:20px">
        <a href="${BUSINESS.siteUrl}/booking/${o.id}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Track your booking</a>
      </p>
      <p style="font-size:13px;color:#666">Questions? Call or WhatsApp us at ${BUSINESS.phone}.</p>
    </div>`;
}

function assignmentEmailHtml(o: Order): string {
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:620px">
      <h2 style="margin:0 0 4px">Your cab is assigned 🚗</h2>
      <p style="margin:0 0 16px;color:#555">Booking <strong>${escapeHtml(o.id)}</strong> · Pickup ${escapeHtml(istDateTime(o.pickupAt))}</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="border-bottom:1px solid #eee;color:#666;width:38%">Vehicle</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(o.vehicleModel ?? "—")}</strong></td></tr>
        <tr><td style="border-bottom:1px solid #eee;color:#666">Number plate</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(o.vehicleNumber ?? "—")}</strong></td></tr>
        <tr><td style="border-bottom:1px solid #eee;color:#666">Driver</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(o.driverName ?? "—")}</strong></td></tr>
        <tr><td style="border-bottom:1px solid #eee;color:#666">Balance to pay driver</td><td style="border-bottom:1px solid #eee"><strong>${inr(o.balanceAmount)}</strong> + tolls, parking, state tax</td></tr>
      </table>
      <p style="margin-top:16px;font-size:13px;color:#555;background:#f1f5f9;padding:11px 13px;border-radius:6px">
        We&rsquo;ll send the driver&rsquo;s number about ${BUSINESS.driverContactHoursBefore} hours before pickup.
        Until then, anything you need goes through us.
      </p>
      <p style="font-size:13px;color:#666;margin-top:14px">Any issue during the trip, call us first at ${BUSINESS.phone} — not the driver.</p>
    </div>`;
}

/* ------------------------------------------------------------- Entry points */

/** Fired the moment a booking is created — before any money has moved. */
export async function notifyNewOrder(o: Order): Promise<NotifyResult[]> {
  const heading = "🆕 New booking (advance not paid)";
  const jobs: Promise<NotifyResult>[] = [
    sendTelegram(ownerTelegramText(o, heading)),
    sendEmail(BUSINESS.email, `${heading} · ${o.id} · ${o.customerName}`, ownerEmailHtml(o, heading)),
    sendWhatsApp(`91${o.customerPhone}`, process.env.WHATSAPP_TEMPLATE_NEW_ORDER || "booking_received", [
      o.customerName,
      o.id,
      inrExact(o.payableAmount),
    ]),
  ];
  if (o.customerEmail) {
    jobs.push(sendEmail(o.customerEmail, `Booking ${o.id} received — ${BUSINESS.brandName}`, customerEmailHtml(o)));
  }
  return Promise.all(jobs);
}

/**
 * Fired when YOU mark the advance as received in the admin panel. That is the
 * only way a booking becomes confirmed — there is no path where the customer
 * confirms their own payment.
 */
export async function notifyPaymentConfirmed(o: Order): Promise<NotifyResult[]> {
  if (!o.customerEmail) return [];
  return Promise.all([
    sendEmail(
      o.customerEmail,
      `Booking ${o.id} confirmed \u2014 ${BUSINESS.brandName}`,
      customerEmailHtml(o),
    ),
  ]);
}

/** Fired when you fill in the cab and driver details in the admin panel. */
export async function notifyAssignment(o: Order): Promise<NotifyResult[]> {
  const jobs: Promise<NotifyResult>[] = [
    sendWhatsApp(`91${o.customerPhone}`, process.env.WHATSAPP_TEMPLATE_CAB_ASSIGNED || "cab_assigned", [
      o.customerName,
      o.id,
      o.driverName ?? "",
      o.driverPhone ?? "",
      o.vehicleNumber ?? "",
    ]),
  ];
  if (o.customerEmail) {
    jobs.push(sendEmail(o.customerEmail, `Your cab for ${o.id} — ${BUSINESS.brandName}`, assignmentEmailHtml(o)));
  }
  return Promise.all(jobs);
}

/**
 * Ready-to-send WhatsApp text for you to paste to the customer, and the wa.me
 * link that opens the chat with it pre-filled. Useful from day one, before the
 * Cloud API is approved — and as the fallback whenever a template send fails.
 */
export function whatsappHandoffLink(o: Order): { text: string; href: string } {
  const text = [
    `${BUSINESS.brandName} — Booking ${o.id}`,
    ``,
    `Hi ${o.customerName}, your cab is confirmed.`,
    `Driver: ${o.driverName ?? "—"} (${o.driverPhone ?? "—"})`,
    `Vehicle: ${o.vehicleModel ?? "—"}, ${o.vehicleNumber ?? "—"}`,
    `Pickup: ${istDateTime(o.pickupAt)}`,
    o.pickupAddress ? `From: ${o.pickupAddress}` : "",
    ``,
    `Balance ${inr(o.balanceAmount)} payable to the driver at drop, plus tolls, parking and state tax.`,
    `Any issue, call us at ${BUSINESS.phone}.`,
  ]
    .filter(Boolean)
    .join("\n");
  return { text, href: `https://wa.me/91${o.customerPhone}?text=${encodeURIComponent(text)}` };
}
