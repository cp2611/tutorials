import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Minimal admin session: an HMAC-signed cookie, no user table.
 *
 * The admin panel holds customer names, phone numbers and addresses, so it is
 * never left open — an unprotected orders list is a personal-data breach under
 * the DPDP Act, not just an inconvenience.
 */

const COOKIE = "cab_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "insecure-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function makeToken(): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin") return false;
  if (!safeEqual(sig, sign(`${role}.${exp}`))) return false;
  return Number(exp) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
