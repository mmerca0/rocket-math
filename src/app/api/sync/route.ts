/**
 * POST /api/sync — upload this device's pilots and new scores; get back
 * every pilot in the family. Requires the family code header.
 */
import { parseSyncRequest } from "@/lib/leaderboard/schema";
import { checkFamilyCode, errorResponse, json } from "@/server/api";
import { syncFamily } from "@/server/leaderboard";

/** Plenty for 50 pilots + 500 scores; anything bigger is refused. */
const MAX_BODY_BYTES = 200_000;

export async function POST(request: Request) {
  const denied = checkFamilyCode(request);
  if (denied) return denied;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return json({ error: "too-large" }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(
      { error: "invalid-request", detail: "Body must be JSON." },
      400,
    );
  }
  const parsed = parseSyncRequest(body);
  if (!parsed.ok) {
    return json({ error: "invalid-request", detail: parsed.error }, 400);
  }

  try {
    return json(await syncFamily(parsed.value));
  } catch (error) {
    return errorResponse(error);
  }
}
