import { CAB_TYPES, TRIP_TYPES, type CabTypeId, type TripType } from "@/config/fares";

export function inr(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/** Renders an instant in IST regardless of where the server runs. */
export function istDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function istDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function tripTypeLabel(t: TripType): string {
  return TRIP_TYPES.find((x) => x.id === t)?.label ?? t;
}

export function cabTypeName(c: CabTypeId): string {
  return CAB_TYPES.find((x) => x.id === c)?.name ?? c;
}

/** Normalises Indian mobile input to bare 10 digits, or null if not valid. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  if (ten.length !== 10) return null;
  if (!/^[6-9]/.test(ten)) return null;
  return ten;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
