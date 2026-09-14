import { NextResponse } from "next/server";
import { CAB_TYPES } from "@/config/fares";
import { buildQuote, QuoteError, validateSchedule } from "@/lib/pricing";
import { quoteSchema } from "@/lib/validation";
import type { CabTypeId, TripType } from "@/config/fares";
import type { Quote } from "@/lib/pricing";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prices every cab type for one set of trip details in a single round trip,
 * so the customer sees a real comparison table rather than picking a car blind.
 */
export async function POST(req: Request) {
  // Generous enough that nobody comparing cars ever notices, tight enough that
  // scraping the whole fare table takes a very long time.
  const limit = await rateLimit("quote:ip", clientIp(req), 120, 10 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many price checks. Please wait a moment." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = quoteSchema.omit({ cabTypeId: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the trip details." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const problems = validateSchedule({
    tripType: input.tripType as TripType,
    pickupCity: input.pickupCity,
    pickupAt: input.pickupAt,
    returnAt: input.returnAt,
  });

  // Report a trip we cannot service BEFORE trying to price it. Otherwise a
  // missing-distance error masks the far more useful "we don't pick up there".
  if (problems.length > 0) {
    return NextResponse.json({ quotes: [], problems });
  }

  const quotes: { cabTypeId: CabTypeId; quote: Quote }[] = [];
  let quoteError: string | null = null;

  for (const cab of CAB_TYPES) {
    try {
      quotes.push({
        cabTypeId: cab.id,
        quote: buildQuote({ ...input, tripType: input.tripType as TripType, cabTypeId: cab.id }),
      });
    } catch (e) {
      if (e instanceof QuoteError) {
        quoteError = e.message;
        break;
      }
      throw e;
    }
  }

  if (quoteError) return NextResponse.json({ error: quoteError }, { status: 400 });

  return NextResponse.json({ quotes, problems });
}
