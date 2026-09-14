import { getSqlForRateLimit, usingPostgres } from "@/lib/db";

/**
 * Fixed-window rate limiting, shared across server instances.
 *
 * Counters live in Postgres rather than in memory because Vercel runs many
 * short-lived instances: an in-memory counter resets on every cold start, so
 * anyone spraying requests would get a fresh allowance each time — which is
 * exactly the case this exists to stop.
 *
 * A local dev run without DATABASE_URL falls back to memory, which is fine
 * there because there is only one process.
 */

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
  return existing.count > limit
    ? { ok: false, remaining: 0, retryAfterSeconds }
    : { ok: true, remaining: limit - existing.count, retryAfterSeconds };
}

/**
 * `bucket` groups the limit (e.g. "order"), `subject` is who is being limited
 * (an IP, a phone number). Failures fail OPEN: a database hiccup must never
 * stop real customers booking.
 */
export async function rateLimit(
  bucket: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `${bucket}:${subject}`;
  if (!usingPostgres) return memoryLimit(key, limit, windowSeconds);

  try {
    const sql = await getSqlForRateLimit();
    const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
    const rows = await sql<{ hits: number }[]>`
      insert into rate_limits (key, window_start, hits)
      values (${key}, ${windowStart.toISOString()}, 1)
      on conflict (key, window_start)
      do update set hits = rate_limits.hits + 1
      returning hits
    `;
    const hits = rows[0]?.hits ?? 1;
    const retryAfterSeconds = Math.ceil(
      (windowStart.getTime() + windowSeconds * 1000 - Date.now()) / 1000,
    );
    return hits > limit
      ? { ok: false, remaining: 0, retryAfterSeconds }
      : { ok: true, remaining: limit - hits, retryAfterSeconds };
  } catch (e) {
    console.error("[ratelimit] falling open", e);
    return { ok: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Best-effort client IP. Spoofable, which is why it is never the only defence. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
