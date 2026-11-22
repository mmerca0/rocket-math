/**
 * All database work for the leaderboard. The route handlers call these.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LevelId } from "@/game/levels";
import {
  LEADERBOARD_SIZE,
  type LeaderboardEntry,
  type SyncPilot,
  type SyncRequest,
  type SyncResponse,
} from "@/lib/leaderboard/schema";
import { DatabaseError, getSupabase } from "./supabase";

const PILOTS = "math_pilots";
const SCORES = "math_scores";
/** Postgres error code for "unique constraint violated". */
const UNIQUE_VIOLATION = "23505";

type DbError = { message: string; code?: string } | null;

function fail(error: NonNullable<DbError>): never {
  throw new DatabaseError(error.message, error.code);
}

async function fetchPilots(db: SupabaseClient): Promise<SyncPilot[]> {
  const { data, error } = await db
    .from(PILOTS)
    .select("id, name, created_at")
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) fail(error);
  return (data ?? []) as SyncPilot[];
}

/**
 * Works out which incoming pilots already exist (same id, or same name
 * ignoring case) and which are new. Pure function — no database.
 */
export function matchPilots(
  incoming: SyncPilot[],
  existing: SyncPilot[],
): { idMap: Record<string, string>; toInsert: SyncPilot[] } {
  const byId = new Set(existing.map((p) => p.id));
  const byName = new Map(existing.map((p) => [p.name.toLowerCase(), p.id]));
  const idMap: Record<string, string> = {};
  const toInsert: SyncPilot[] = [];

  for (const p of incoming) {
    if (byId.has(p.id)) {
      idMap[p.id] = p.id;
      continue;
    }
    const sameName = byName.get(p.name.toLowerCase());
    if (sameName) {
      idMap[p.id] = sameName;
      continue;
    }
    toInsert.push(p);
    byId.add(p.id);
    byName.set(p.name.toLowerCase(), p.id);
    idMap[p.id] = p.id;
  }
  return { idMap, toInsert };
}

async function insertPilots(db: SupabaseClient, rows: SyncPilot[]) {
  if (rows.length === 0) return null;
  const { error } = await db
    .from(PILOTS)
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  return error as DbError;
}

/**
 * Uploads pilots and scores from one device, without creating duplicates,
 * and returns every pilot so the device can download ones it's missing.
 */
export async function syncFamily(input: SyncRequest): Promise<SyncResponse> {
  const db = getSupabase();
  let existing = await fetchPilots(db);
  let { idMap, toInsert } = matchPilots(input.pilots, existing);

  const error = await insertPilots(db, toInsert);
  if (error) {
    if (error.code !== UNIQUE_VIOLATION) fail(error);
    // Another device added the same name at the same moment.
    // Read again, re-match and try once more.
    existing = await fetchPilots(db);
    ({ idMap, toInsert } = matchPilots(input.pilots, existing));
    const retryError = await insertPilots(db, toInsert);
    if (retryError) fail(retryError);
  }
  const pilots = [...existing, ...toInsert];
  const known = new Set(pilots.map((p) => p.id));

  // Point each score at the pilot's server id; skip scores for unknown pilots.
  const scores = input.scores
    .map((s) => ({ ...s, pilot_id: idMap[s.pilot_id] ?? s.pilot_id }))
    .filter((s) => known.has(s.pilot_id));

  if (scores.length > 0) {
    const { error: scoreError } = await db
      .from(SCORES)
      .upsert(scores, { onConflict: "id", ignoreDuplicates: true });
    if (scoreError) fail(scoreError);
  }

  return {
    pilots,
    idMap,
    acceptedScoreIds: scores.map((s) => s.id),
  };
}

interface ScoreRow {
  id: string;
  pilot_id: string;
  score: number;
  accuracy: number | null;
  played_at: string;
  pilot: { name: string } | { name: string }[] | null;
}

/** The family's top 10 for one level, highest first (earliest wins ties). */
export async function topScores(level: LevelId): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabase()
    .from(SCORES)
    .select("id, pilot_id, score, accuracy, played_at, pilot:math_pilots(name)")
    .eq("level", level)
    .order("score", { ascending: false })
    .order("played_at", { ascending: true })
    .limit(LEADERBOARD_SIZE);
  if (error) fail(error);
  return ((data ?? []) as ScoreRow[]).map((row) => {
    const pilot = Array.isArray(row.pilot) ? row.pilot[0] : row.pilot;
    return {
      id: row.id,
      pilot_id: row.pilot_id,
      name: pilot?.name ?? "?",
      score: row.score,
      accuracy: row.accuracy,
      played_at: row.played_at,
    };
  });
}

/** The tiniest possible query, to prove the database is awake. */
export async function ping(): Promise<void> {
  const { error } = await getSupabase().from(PILOTS).select("id").limit(1);
  if (error) fail(error);
}
