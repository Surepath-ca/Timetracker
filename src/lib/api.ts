import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler: AuthError -> 401, unexpected errors -> 500. */
export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return jsonError("Not authenticated", 401);
  console.error(err);
  // Surface a database/config hint so deploy problems are diagnosable without
  // digging through server logs. A Prisma code (e.g. P1001 "can't reach db",
  // P2021 "table does not exist") points straight at the misconfiguration.
  const e = err as { code?: string; message?: string };
  if (typeof e?.code === "string" && /^P\d{4}$/.test(e.code)) {
    return jsonError(
      `Database error ${e.code}. Check the deployment's DATABASE_URL and that migrations ran (see /api/health).`,
      500
    );
  }
  return jsonError("Something went wrong. See /api/health for diagnostics.", 500);
}
