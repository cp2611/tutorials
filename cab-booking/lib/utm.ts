import type { Utm } from "@/lib/types";

const KEYS = ["source", "medium", "campaign", "term", "content"] as const;

/**
 * Pulls campaign attribution out of the landing URL.
 *
 * Without this you are buying clicks and have no idea which campaign produced
 * which booking — which makes every ad-spend decision a guess. Captured on the
 * landing page, carried through the funnel, and frozen onto the order.
 */
export function readUtm(search: string, referrer?: string, landingPath?: string): Utm {
  const p = new URLSearchParams(search);
  const utm: Utm = {};
  for (const k of KEYS) {
    const v = p.get(`utm_${k}`);
    if (v) utm[k] = v.slice(0, 160);
  }
  const gclid = p.get("gclid");
  const fbclid = p.get("fbclid");
  if (gclid) utm.gclid = gclid.slice(0, 200);
  if (fbclid) utm.fbclid = fbclid.slice(0, 200);
  if (referrer) utm.referrer = referrer.slice(0, 300);
  if (landingPath) utm.landingPath = landingPath.slice(0, 300);
  return utm;
}

const STORAGE_KEY = "cab_utm";

/** First touch wins — a later direct visit must not overwrite the paid click. */
export function persistUtm(utm: Utm): void {
  try {
    if (Object.keys(utm).length === 0) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    /* private mode / storage disabled — attribution is nice-to-have, never fatal */
  }
}

export function loadUtm(): Utm {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Utm) : {};
  } catch {
    return {};
  }
}
