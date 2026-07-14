import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, isAllowedEmail, normalizeEmail, allowedDomains } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { jsonError, handleApiError } from "@/lib/api";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ACTIVE_REQUESTS = 3; // per email within the TTL window

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Please enter a valid email address.");
    }
    if (!isAllowedEmail(email)) {
      return jsonError(
        `Access is restricted to SurePath employees (@${allowedDomains().join(", @")} emails).`,
        403
      );
    }

    // Throttle: max active codes per email in the TTL window.
    const recent = await prisma.otpToken.count({
      where: { email, createdAt: { gt: new Date(Date.now() - OTP_TTL_MS) }, consumedAt: null },
    });
    if (recent >= MAX_ACTIVE_REQUESTS) {
      return jsonError("Too many codes requested. Please wait a few minutes and try again.", 429);
    }

    const code = generateOtp();
    await prisma.otpToken.create({
      data: { email, codeHash: hashOtp(email, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await sendOtpEmail(email, code);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
