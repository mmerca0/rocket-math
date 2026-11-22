/**
 * GET /api/health — runs one tiny database query.
 *
 * Called once a day by .github/workflows/keep-alive.yml so the free Supabase
 * project sees activity and doesn't pause. Needs no family code and returns
 * no data, only whether the database answered.
 */
import { connection } from "next/server";
import { errorResponse, json } from "@/server/api";
import { ping } from "@/server/leaderboard";

export async function GET() {
  // Always run at request time — never prerender or cache this at build.
  await connection();
  try {
    await ping();
    return json({ ok: true });
  } catch (error) {
    const res = errorResponse(error);
    const { error: reason } = (await res.json()) as { error: string };
    return json({ ok: false, error: reason }, res.status);
  }
}
