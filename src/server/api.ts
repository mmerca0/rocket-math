/**
 * Small helpers shared by the route handlers in src/app/api/.
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { FAMILY_CODE_HEADER } from "@/lib/leaderboard/schema";
import { DatabaseError, NotConfiguredError } from "./supabase";

/** JSON response that browsers and CDNs must never cache. */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function sha256(text: string): Buffer {
  return createHash("sha256").update(text, "utf8").digest();
}

/**
 * Compares two strings in constant time, so an attacker can't guess the
 * code one character at a time by measuring how long the check takes.
 * Hashing first makes both sides the same length (timingSafeEqual needs that)
 * without revealing the real code's length.
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/**
 * Checks the family code sent by the browser against FAMILY_CODE.
 * Returns an error Response to send back, or null if the code is right.
 */
export function checkFamilyCode(request: Request): Response | null {
  const expected = process.env.FAMILY_CODE?.trim();
  if (!expected) {
    // Never accept anything when the server has no code configured.
    return json({ error: "not-configured" }, 503);
  }
  let given = "";
  try {
    given = decodeURIComponent(
      request.headers.get(FAMILY_CODE_HEADER) ?? "",
    ).trim();
  } catch {
    given = ""; // malformed encoding → treat as wrong
  }
  // Always run the comparison (even for an empty code) so timing is the same.
  const ok = safeEqual(given, expected) && given.length > 0;
  return ok ? null : json({ error: "wrong-family-code" }, 401);
}

/** Turns a thrown error into the right response, logging the details. */
export function errorResponse(error: unknown): Response {
  if (error instanceof NotConfiguredError) {
    return json({ error: "not-configured" }, 503);
  }
  console.error(
    "[api] database error:",
    error instanceof DatabaseError
      ? `${error.code ?? ""} ${error.message}`
      : error,
  );
  return json({ error: "database-unavailable" }, 503);
}
