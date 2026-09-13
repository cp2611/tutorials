import type { OrderStatus } from "@/lib/types";

const FLOW: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "PENDING_PAYMENT", label: "Booking received", hint: "We have your trip details" },
  { status: "CONFIRMED", label: "Advance confirmed", hint: "Arranging your cab" },
  { status: "ASSIGNED", label: "Cab assigned", hint: "Driver details sent to you" },
];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        This booking was cancelled.
      </p>
    );
  }
  const current = Math.max(0, FLOW.findIndex((f) => f.status === status));
  const reached = status === "COMPLETED" ? FLOW.length : current;

  return (
    <ol className="grid gap-0">
      {FLOW.map((step, i) => {
        const done = i < reached;
        const active = i === reached;
        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  done ? "bg-green-600 text-white" : active ? "bg-brand-600 text-white" : "bg-ink-200 text-ink-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < FLOW.length - 1 && (
                <span className={`w-0.5 flex-1 ${done ? "bg-green-600" : "bg-ink-200"}`} />
              )}
            </div>
            <div className={`pb-5 ${i === FLOW.length - 1 ? "pb-0" : ""}`}>
              <p className={`text-sm font-semibold ${done || active ? "text-ink-900" : "text-ink-400"}`}>
                {step.label}
              </p>
              <p className="text-xs text-ink-500">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
