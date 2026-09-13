import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, checkPassword, makeToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Small deterrent against password guessing on a single-password admin. */
const attempts = new Map<string, { count: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.until > now && record.count >= 8) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set. Add it to your environment variables." },
      { status: 500 },
    );
  }

  if (!checkPassword(password)) {
    const next = record && record.until > now ? record : { count: 0, until: now + 10 * 60_000 };
    next.count += 1;
    attempts.set(ip, next);
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url), 303);
  }

  attempts.delete(ip);
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(ADMIN_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
