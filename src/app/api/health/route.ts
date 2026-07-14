import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public diagnostics endpoint. Reports whether the deployment is configured
 * correctly WITHOUT exposing any secret values (only booleans + error text).
 * Useful for debugging Vercel deploys. Safe to leave in — it reveals no secrets.
 */
export async function GET() {
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
