/**
 * GET /api/leaderboard?level=3 — the family's top 10 for one level.
 * Requires the family code header.
 */
import { connection } from "next/server";
import { isLevelId } from "@/game/levels";
import { checkFamilyCode, errorResponse, json } from "@/server/api";
import { topScores } from "@/server/leaderboard";

export async function GET(request: Request) {
  // Always run at request time — never prerender or cache this at build.
  await connection();

  const denied = checkFamilyCode(request);
  if (denied) return denied;

  const level = new URL(request.url).searchParams.get("level") ?? "";
  if (!isLevelId(level)) {
    return json({ error: "invalid-request", detail: "Unknown level." }, 400);
  }

  try {
    return json({ level, scores: await topScores(level) });
  } catch (error) {
    return errorResponse(error);
  }
}
