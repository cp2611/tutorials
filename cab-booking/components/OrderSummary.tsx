import { cabTypeName, istDateTime, tripTypeLabel } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrderSummary({ order }: { order: Order }) {
  const rows: [string, string][] = [
    ["Trip", `${tripTypeLabel(order.tripType)} · ${cabTypeName(order.cabTypeId)}`],
    ["Pickup", istDateTime(order.pickupAt)],
  ];
  if (order.returnAt) rows.push(["Return", istDateTime(order.returnAt)]);
  if (order.pickupAddress) rows.push(["From", order.pickupAddress]);
  else if (order.pickupCity) rows.push(["From", order.pickupCity]);
  if (order.dropAddress) rows.push(["To", order.dropAddress]);
  else if (order.dropCity) rows.push(["To", order.dropCity]);
  if (order.passengers) rows.push(["Passengers", String(order.passengers)]);
  if (order.customerNotes) rows.push(["Your note", order.customerNotes]);

  return (
    <dl className="divide-y divide-ink-100 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 py-2.5">
          <dt className="w-28 shrink-0 text-ink-500">{k}</dt>
          <dd className="font-medium text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
