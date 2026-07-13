import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "sp_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s === "change-me-to-a-long-random-string") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
  }
  return new TextEncoder().encode(s || "surepath-dev-secret");
}

export function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "surepathvaluation.ca")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1);
  return allowedDomains().includes(domain);
}

export function hashOtp(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export type SessionUser = { id: string; email: string };

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Returns the authenticated user from the session cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  // Ensure the user still exists (e.g. wasn't removed from the DB).
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  return user ? { id: user.id, email: user.email } : null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError();
  return user;
}

export class AuthError extends Error {
  constructor() {
    super("Not authenticated");
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
