/**
 * The business runs entirely on Indian Standard Time, but the browser and the
 * server may be anywhere. Every conversion here pins the wall-clock the
 * customer typed to IST explicitly, so a booking never drifts by 5½ hours
 * because a phone was set to another timezone or Vercel ran the code in UTC.
 */

const IST_OFFSET_MS = 5.5 * 3600e3;

/** "2026-09-20T14:30" (typed as IST) → ISO instant. */
export function istLocalToIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(`${local}:00.000+05:30`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

/** ISO instant → "2026-09-20T14:30" in IST, for a datetime-local input. */
export function isoToIstLocal(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** IST wall-clock `hours` from now, for the `min` attribute on a date input. */
export function istLocalIn(hours: number): string {
  return new Date(Date.now() + hours * 3600e3 + IST_OFFSET_MS).toISOString().slice(0, 16);
}
