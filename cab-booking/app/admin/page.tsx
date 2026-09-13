import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import { listOrders, usingPostgres } from "@/lib/db";
import { inr, istDateTime, tripTypeLabel } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAYMENT_CLAIMED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  ASSIGNED: "bg-green-100 text-green-800",
  COMPLETED: "bg-ink-200 text-ink-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { status, q } = await searchParams;

  const filter = (status as OrderStatus | "ALL") ?? "ALL";
  const orders = await listOrders({ status: filter, search: q });

  const counts = {
    toVerify: orders.filter((o) => o.status === "PAYMENT_CLAIMED").length,
    toAssign: orders.filter((o) => o.status === "CONFIRMED").length,
    unpaid: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-900">Orders</h1>
        <form method="post" action="/api/admin/logout">
          <button className="btn-secondary" type="submit">Sign out</button>
        </form>
      </div>

      {!usingPostgres && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Local file storage in use.</strong> DATABASE_URL is not set, so orders are saved to
          <code className="mx-1 rounded bg-amber-100 px-1">.data/orders.json</code>. Serverless
          filesystems are wiped between deploys — set DATABASE_URL before taking real bookings.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Advance to verify", counts.toVerify, "PAYMENT_CLAIMED"],
          ["Cabs to assign", counts.toAssign, "CONFIRMED"],
          ["Unpaid — call these back", counts.unpaid, "PENDING_PAYMENT"],
        ].map(([label, count, s]) => (
          <Link key={String(s)} href={`/admin?status=${s}`} className="card p-4 transition hover:border-ink-400">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="text-2xl font-bold text-ink-900">{count as number}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin" className={`chip ${filter === "ALL" ? "!border-ink-900 !bg-ink-900 !text-white" : ""}`}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin?status=${s}`}
            className={`chip ${filter === s ? "!border-ink-900 !bg-ink-900 !text-white" : ""}`}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
        <form method="get" className="ml-auto flex gap-2">
          {filter !== "ALL" && <input type="hidden" name="status" value={filter} />}
          <input name="q" defaultValue={q ?? ""} placeholder="Booking ID, name, phone, UTR"
            className="input !py-2 !text-sm w-56" />
          <button className="btn-secondary !py-2" type="submit">Search</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="card p-8 text-center text-sm text-ink-500">No orders here yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3 text-right">Advance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-600 hover:underline">
                      {o.id}
                    </Link>
                    <p className="text-xs text-ink-400">{istDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{o.customerName}</p>
                    <p className="text-xs text-ink-500">+91 {o.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    <p>{tripTypeLabel(o.tripType)}</p>
                    <p className="text-xs text-ink-500">
                      {[o.pickupCity, o.dropCity].filter(Boolean).join(" → ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{istDateTime(o.pickupAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold tabular-nums text-ink-900">₹{o.payableAmount}</p>
                    <p className="text-xs text-ink-500">of {inr(o.totalAmount)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
