import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time string comparison that never throws on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Diagnostics endpoint, protected by a secret token so it is not public.
 *
 * Access requires HEALTH_CHECK_TOKEN to be set (as an env var) and supplied on
 * the request via `?token=...` or the `x-health-token` header. If the token is
 * not configured or does not match, the endpoint responds 404 so its existence
 * is not revealed. It stays reachable without a login so you can diagnose a
 * broken deploy (e.g. database down) when you can't sign in.
 *
 * It never returns secret VALUES — only booleans, the DB host, and the commit.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  const provided =
    req.nextUrl.searchParams.get("token") || req.headers.get("x-health-token") || "";
  if (!expected || !safeEqual(provided, expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result: Record<string, unknown> = {
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "unknown",
    nodeEnv: process.env.NODE_ENV,
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      SESSION_SECRET: Boolean(
        process.env.SESSION_SECRET &&
          process.env.SESSION_SECRET !== "change-me-to-a-long-random-string"
      ),
      SMTP_HOST: Boolean(process.env.SMTP_HOST),
      ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS || "(default) surepathvaluation.ca",
    },
    database: { reachable: false, tablesReady: false, error: null as string | null },
  };

  // Show the database host (never the password) to catch wrong-URL mistakes.
  try {
    if (process.env.DATABASE_URL) {
      const u = new URL(process.env.DATABASE_URL);
      result.databaseHost = `${u.protocol}//${u.hostname}:${u.port || "5432"}${u.pathname}`;
      result.databasePooled = u.searchParams.has("pgbouncer") || /pooler|pgbouncer/.test(u.hostname);
    }
  } catch {
    result.databaseHost = "(unparseable DATABASE_URL)";
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    (result.database as Record<string, unknown>).reachable = true;
    // Confirm migrations ran (the User table exists).
    await prisma.user.count();
    (result.database as Record<string, unknown>).tablesReady = true;
  } catch (err) {
    result.ok = false;
    const e = err as { message?: string; code?: string };
    (result.database as Record<string, unknown>).error =
      `${e.code ? `[${e.code}] ` : ""}${(e.message || String(err)).slice(0, 500)}`;
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
