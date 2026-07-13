import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashOtp,
  isAllowedEmail,
  normalizeEmail,
  safeEqualHex,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { jsonError, handleApiError } from "@/lib/api";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
      return jsonError("Please enter the 6-digit code from your email.");
    }
    if (!isAllowedEmail(email)) {
      return jsonError("Access is restricted to SurePath employees.", 403);
    }

    const token = await prisma.otpToken.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!token) {
      return jsonError("Code expired or not found. Please request a new one.", 400);
    }
    if (token.attempts >= MAX_ATTEMPTS) {
      return jsonError("Too many incorrect attempts. Please request a new code.", 429);
    }

    if (!safeEqualHex(token.codeHash, hashOtp(email, code))) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      return jsonError("Incorrect code. Please try again.", 400);
    }

    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
    // Invalidate any other outstanding codes for this email.
    await prisma.otpToken.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0].replace(/[._-]+/g, " ") },
    });

    const jwt = await createSessionToken(user.id, user.email);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
