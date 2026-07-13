import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler: AuthError -> 401, unexpected errors -> 500. */
export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return jsonError("Not authenticated", 401);
  console.error(err);
  return jsonError("Something went wrong", 500);
}
