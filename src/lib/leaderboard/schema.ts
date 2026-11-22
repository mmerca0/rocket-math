/**
 * The shape of the leaderboard API, and the rules for what's valid.
 *
 * Shared by the server (to reject bad requests) and the browser (to skip
 * anything the server would reject, so one bad score can't block syncing
 * forever). The rules match the check constraints in
 * supabase/migrations/*_math_leaderboard.sql — change both together.
 *
 * No secrets or server code here: this file is safe in the browser.
 */
import { isLevelId, type LevelId } from "@/game/levels";

export const PILOT_NAME_MAX = 20;
export const SCORE_MAX = 1_000_000;
export const MAX_PILOTS_PER_SYNC = 50;
export const MAX_SCORES_PER_SYNC = 500;
export const LEADERBOARD_SIZE = 10;
/** Header the browser sends the family code in (URI-encoded). */
export const FAMILY_CODE_HEADER = "x-family-code";

/** Earliest date we accept; anything older is a broken clock. */
const MIN_DATE = Date.parse("2020-01-01T00:00:00Z");
/** Allow a little clock drift between devices and the server. */
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

export interface SyncPilot {
  id: string;
  name: string;
  created_at: string;
}

export interface SyncScore {
  id: string;
  pilot_id: string;
  level: LevelId;
  score: number;
  /** Percent correct 0–100, or null if unknown (older scores). */
  accuracy: number | null;
  played_at: string;
}

export interface SyncRequest {
  pilots: SyncPilot[];
  scores: SyncScore[];
}

export interface SyncResponse {
  /** Every pilot in the family, so new devices can download them. */
  pilots: SyncPilot[];
  /**
   * Device id → server id, for pilots that already existed on the server
   * under the same name (e.g. "Leo" created on two devices).
   */
  idMap: Record<string, string>;
  /** Scores now safely stored (including ones that were already there). */
  acceptedScoreIds: string[];
}

export interface LeaderboardEntry {
  id: string;
  pilot_id: string;
  name: string;
  score: number;
  accuracy: number | null;
  played_at: string;
}

export interface LeaderboardResponse {
  level: LevelId;
  scores: LeaderboardEntry[];
}

// ---------- Field checks ----------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** Collapses spaces and trims, the same way the game cleans names. */
export function cleanPilotName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isValidName(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const name = cleanPilotName(v);
  // No invisible control characters (codes below 32, and 127).
  const printable = [...name].every((ch) => {
    const c = ch.charCodeAt(0);
    return c >= 32 && c !== 127;
  });
  return (
    name === v && name.length >= 1 && name.length <= PILOT_NAME_MAX && printable
  );
}

function isValidDate(v: unknown, now: number): v is string {
  if (typeof v !== "string" || v.length > 40) return false;
  const t = Date.parse(v);
  return Number.isFinite(t) && t >= MIN_DATE && t <= now + MAX_FUTURE_MS;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------- Parsers (return null when invalid) ----------

export function parsePilot(v: unknown, now = Date.now()): SyncPilot | null {
  if (!isRecord(v)) return null;
  const { id, name, created_at } = v;
  if (!isUuid(id) || !isValidName(name) || !isValidDate(created_at, now))
    return null;
  return { id: id.toLowerCase(), name, created_at };
}

export function parseScore(v: unknown, now = Date.now()): SyncScore | null {
  if (!isRecord(v)) return null;
  const { id, pilot_id, level, score, accuracy, played_at } = v;
  if (!isUuid(id) || !isUuid(pilot_id)) return null;
  if (typeof level !== "string" || !isLevelId(level)) return null;
  if (!Number.isInteger(score) || (score as number) < 0) return null;
  if ((score as number) > SCORE_MAX) return null;
  const accuracyOk =
    accuracy === null ||
    (Number.isInteger(accuracy) &&
      (accuracy as number) >= 0 &&
      (accuracy as number) <= 100);
  if (!accuracyOk || !isValidDate(played_at, now)) return null;
  return {
    id: id.toLowerCase(),
    pilot_id: pilot_id.toLowerCase(),
    level,
    score: score as number,
    accuracy: accuracy as number | null,
    played_at,
  };
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates a whole sync request. One bad item rejects the request. */
export function parseSyncRequest(
  v: unknown,
  now = Date.now(),
): Parsed<SyncRequest> {
  if (!isRecord(v)) return { ok: false, error: "Body must be an object." };
  const { pilots, scores } = v;
  if (!Array.isArray(pilots) || !Array.isArray(scores))
    return { ok: false, error: "pilots and scores must be arrays." };
  if (pilots.length > MAX_PILOTS_PER_SYNC)
    return { ok: false, error: `At most ${MAX_PILOTS_PER_SYNC} pilots.` };
  if (scores.length > MAX_SCORES_PER_SYNC)
    return { ok: false, error: `At most ${MAX_SCORES_PER_SYNC} scores.` };

  const goodPilots: SyncPilot[] = [];
  for (const [i, p] of pilots.entries()) {
    const parsed = parsePilot(p, now);
    if (!parsed) return { ok: false, error: `pilots[${i}] is invalid.` };
    goodPilots.push(parsed);
  }
  const goodScores: SyncScore[] = [];
  for (const [i, s] of scores.entries()) {
    const parsed = parseScore(s, now);
    if (!parsed) return { ok: false, error: `scores[${i}] is invalid.` };
    goodScores.push(parsed);
  }
  return { ok: true, value: { pilots: goodPilots, scores: goodScores } };
}

/** Browser side: checks the server's sync answer looks right. */
export function parseSyncResponse(v: unknown): SyncResponse | null {
  if (!isRecord(v)) return null;
  const { pilots, idMap, acceptedScoreIds } = v;
  if (!Array.isArray(pilots) || !isRecord(idMap)) return null;
  if (!Array.isArray(acceptedScoreIds)) return null;
  const goodPilots = pilots
    .map((p) => parsePilot(p, Number.POSITIVE_INFINITY))
    .filter((p): p is SyncPilot => p !== null);
  const map: Record<string, string> = {};
  for (const [from, to] of Object.entries(idMap)) {
    if (isUuid(from) && isUuid(to)) map[from.toLowerCase()] = to.toLowerCase();
  }
  return {
    pilots: goodPilots,
    idMap: map,
    acceptedScoreIds: acceptedScoreIds
      .filter(isUuid)
      .map((id) => id.toLowerCase()),
  };
}

/** Browser side: checks the server's leaderboard answer looks right. */
export function parseLeaderboardResponse(
  v: unknown,
): LeaderboardEntry[] | null {
  if (!isRecord(v) || !Array.isArray(v.scores)) return null;
  return v.scores.filter(
    (s): s is LeaderboardEntry =>
      isRecord(s) &&
      typeof s.id === "string" &&
      typeof s.name === "string" &&
      typeof s.score === "number" &&
      (s.accuracy === null || typeof s.accuracy === "number") &&
      typeof s.played_at === "string",
  );
}
