import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { BUSINESS } from "@/config/business";
import { EXCLUSIONS } from "@/config/fares";
import { CopyBox } from "@/components/CopyBox";
import { FareBreakup } from "@/components/FareBreakup";
import { OrderSummary } from "@/components/OrderSummary";
import { isAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/db";
import { cabTypeName, inr, inrExact, istDateTime, tripTypeLabel } from "@/lib/format";
import { whatsappHandoffLink } from "@/lib/notify";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { id } = await params;
  const { saved, error } = await searchParams;
  const order = await getOrder(id.toUpperCase());
  if (!order) notFound();

  const handoff = whatsappHandoffLink(order);

  /**
   * What you forward to the cab partner.
   *
   * Deliberately WITHOUT the customer's phone number: once a partner has it,
   * nothing stops them taking the next booking directly and cutting you out.
   * Release it only after the cab is actually assigned.
   */
  const partnerBrief = [
    `Requirement — ref ${order.id}`,
    ``,
    `${tripTypeLabel(order.tripType)} · ${cabTypeName(order.cabTypeId)}`,
    `Pickup: ${istDateTime(order.pickupAt)}`,
    order.returnAt ? `Return: ${istDateTime(order.returnAt)}` : "",
    `From: ${order.pickupAddress || order.pickupCity || "—"}`,
    `To: ${order.dropAddress || order.dropCity || "—"}`,
    order.passengers ? `Passengers: ${order.passengers}` : "",
    order.quote.chargeableKm ? `Chargeable km: ${order.quote.chargeableKm}` : "",
    order.customerNotes ? `Customer note: ${order.customerNotes}` : "",
    ``,
    `Please confirm availability, driver name, number and vehicle number.`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-brand-600 hover:underline">← All orders</Link>
          <h1 className="font-mono text-2xl font-bold tracking-wider text-ink-900">{order.id}</h1>
          <p className="text-sm text-ink-500">Created {istDateTime(order.createdAt)}</p>
        </div>
        <span className="rounded-full bg-ink-900 px-3 py-1.5 text-sm font-semibold text-white">
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {saved && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">Saved.</p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <div className="grid gap-5">
          {/* ------------------------------------------------ Payment check */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">1 · Mark the advance received</h2>
            <p className="mt-1 text-sm text-ink-500">
              The customer pays by UPI and messages you on WhatsApp. Check the amount below
              against your bank, then confirm here.
            </p>
            <dl className="mt-4 divide-y divide-ink-100 text-sm">
              <div className="flex gap-4 py-2.5">
                <dt className="w-40 shrink-0 text-ink-500">Expected in bank</dt>
                <dd className="font-mono text-base font-bold text-ink-900">{inrExact(order.payableAmount)}</dd>
              </div>
              <div className="flex gap-4 py-2.5">
                <dt className="w-40 shrink-0 text-ink-500">Confirmed by you</dt>
                <dd className="text-ink-700">
                  {order.paymentVerifiedAt ? (
                    istDateTime(order.paymentVerifiedAt)
                  ) : (
                    <span className="text-amber-700">Not yet</span>
                  )}
                </dd>
              </div>
              {order.paymentReference && (
                <div className="flex gap-4 py-2.5">
                  <dt className="w-40 shrink-0 text-ink-500">Your reference</dt>
                  <dd className="font-mono font-semibold text-ink-900">{order.paymentReference}</dd>
                </div>
              )}
            </dl>

            {order.status === "PENDING_PAYMENT" && (
              <form method="post" action={`/api/admin/orders/${order.id}`} className="mt-4 grid gap-3">
                <input type="hidden" name="action" value="verify_payment" />
                <div>
                  <label className="label" htmlFor="paymentReference">
                    Reference <span className="font-normal text-ink-400">(optional, for your own records)</span>
                  </label>
                  <input id="paymentReference" name="paymentReference" className="input"
                    placeholder="UTR from your bank statement, or anything you'll recognise" />
                </div>
                <button className="btn-primary" type="submit">
                  ✓ Advance received — confirm this booking
                </button>
                <p className="text-xs text-ink-500">
                  Only confirm once you have actually seen {inrExact(order.payableAmount)} in your account.
                  A WhatsApp message saying &ldquo;paid&rdquo; is not proof.
                </p>
              </form>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`https://wa.me/91${order.customerPhone}`} target="_blank" rel="noreferrer"
                className="btn-secondary !px-3 !py-1.5 !text-xs">
                Open customer chat →
              </a>
            </div>
          </section>

          {/* ------------------------------------------------ Assign a cab */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">2 · Assign the cab</h2>
            <p className="mt-1 text-sm text-ink-500">
              Saving this emails the customer and moves the booking to “Cab assigned”.
            </p>
            <form method="post" action={`/api/admin/orders/${order.id}`} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="action" value="assign" />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="providerName">Partner / operator</label>
                <input id="providerName" name="providerName" className="input"
                  defaultValue={order.providerName ?? ""} placeholder="Which partner is supplying this cab?" />
              </div>
              <div>
                <label className="label" htmlFor="driverName">Driver name</label>
                <input id="driverName" name="driverName" className="input" required defaultValue={order.driverName ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="driverPhone">Driver phone</label>
                <input id="driverPhone" name="driverPhone" className="input" required defaultValue={order.driverPhone ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="vehicleModel">Vehicle model</label>
                <input id="vehicleModel" name="vehicleModel" className="input"
                  defaultValue={order.vehicleModel ?? ""} placeholder="Swift Dzire" />
              </div>
              <div>
                <label className="label" htmlFor="vehicleNumber">Number plate</label>
                <input id="vehicleNumber" name="vehicleNumber" className="input uppercase" required
                  defaultValue={order.vehicleNumber ?? ""} placeholder="DL 1A 1234" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary" type="submit">Save &amp; notify customer</button>
              </div>
            </form>
          </section>

          {/* ------------------------------------------------ Ready-to-paste */}
          <section className="card grid gap-4 p-5">
            <h2 className="text-base font-bold text-ink-900">3 · Messages to send</h2>
            <CopyBox
              title="Forward to your cab partner"
              hint="No customer phone number here on purpose — share it only once the cab is committed."
              text={partnerBrief}
            />
            <CopyBox
              title="Send to the customer"
              hint="Fill in the driver details above first."
              text={handoff.text}
              action={{ label: "Open WhatsApp →", href: handoff.href }}
            />
          </section>
        </div>

        {/* -------------------------------------------------------- Sidebar */}
        <div className="grid gap-5">
          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold text-ink-900">Customer</h2>
            <p className="font-semibold text-ink-900">{order.customerName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`tel:+91${order.customerPhone}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                📞 +91 {order.customerPhone}
              </a>
              <a href={`https://wa.me/91${order.customerPhone}`} target="_blank" rel="noreferrer"
                className="btn-secondary !px-3 !py-1.5 !text-xs">
                WhatsApp
              </a>
            </div>
            {order.customerEmail && <p className="mt-2 text-sm text-ink-600">{order.customerEmail}</p>}
            <div className="mt-4">
              <OrderSummary order={order} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold text-ink-900">Fare (frozen at booking)</h2>
            <FareBreakup quote={order.quote} compact />
            <p className="mt-3 text-xs text-ink-500">
              Collected by driver: {inr(order.balanceAmount)} + {EXCLUSIONS.join(", ").toLowerCase()}.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold text-ink-900">Campaign</h2>
            {order.utm && Object.keys(order.utm).length > 0 ? (
              <dl className="divide-y divide-ink-100 text-sm">
                {Object.entries(order.utm).map(([k, v]) => (
                  <div key={k} className="flex gap-3 py-2">
                    <dt className="w-24 shrink-0 text-ink-500">{k}</dt>
                    <dd className="break-all text-ink-800">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-ink-500">Direct visit — no campaign tags.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold text-ink-900">Status &amp; notes</h2>
            <form method="post" action={`/api/admin/orders/${order.id}`} className="grid gap-3">
              <input type="hidden" name="action" value="set_status" />
              <select name="status" className="input" defaultValue={order.status}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <input name="reason" className="input" placeholder="Reason (if cancelling)" />
              <button className="btn-secondary" type="submit">Update status</button>
            </form>

            <form method="post" action={`/api/admin/orders/${order.id}`} className="mt-4 grid gap-3">
              <input type="hidden" name="action" value="note" />
              <textarea name="adminNotes" className="input" rows={4} placeholder="Private notes — partner quote, commission, follow-ups…"
                defaultValue={order.adminNotes ?? ""} />
              <button className="btn-secondary" type="submit">Save note</button>
            </form>
          </section>
        </div>
      </div>

      <p className="text-center text-xs text-ink-400">
        Questions from the customer go to {BUSINESS.phone}.
      </p>
    </div>
  );
}
