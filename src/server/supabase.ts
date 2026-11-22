/**
 * The Supabase client for the SERVER. Uses the secret key, which bypasses
 * Row Level Security — so it must never reach the browser.
 *
 * `import "server-only"` makes the build fail if a client component ever
 * imports this file (directly or through another file).
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Thrown when SUPABASE_URL / SUPABASE_SECRET_KEY aren't set. */
export class NotConfiguredError extends Error {
  constructor() {
    super("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
    this.name = "NotConfiguredError";
  }
}

/** Thrown when Supabase answers with an error (or can't be reached). */
export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new NotConfiguredError();
  client = createClient(url, key, {
    // A server has no user session to remember or refresh.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Test helper: forget the cached client (e.g. after changing env vars). */
export function resetSupabaseForTests() {
  client = null;
}
