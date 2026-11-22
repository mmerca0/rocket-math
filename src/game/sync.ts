/**
 * How the device save merges with the family leaderboard. Pure functions:
 * they take a save (and the server's answer) and return a new save. The
 * network part lives in src/lib/sync.ts.
 *
 * The flow, every sync:
 *   1. prepareForSync   — give everything a UUID; queue old scores once.
 *   2. buildSyncRequest — all pilots + queued scores, already validated.
 *   3. (server stores them, skipping anything it already has)
 *   4. applySyncResponse — adopt server ids for same-name pilots, download
 *      pilots from other devices, and clear uploaded scores from the queue.
 */
import { LEVELS, isLevelId } from "./levels";
import {
  MAX_SCORES_PER_SYNC,
  isUuid,
  parsePilot,
  parseScore,
  type SyncPilot,
  type SyncRequest,
  type SyncResponse,
  type SyncScore,
} from "@/lib/leaderboard/schema";
import type { HighScore, PendingScore, Player, SaveData } from "./storage";

/** Replaces pilot ids everywhere in the save, using `map` (old → new). */
export function remapPilotIds(
  data: SaveData,
  map: Record<string, string>,
): SaveData {
  const to = (id: string) => map[id] ?? id;
  if (Object.keys(map).every((k) => map[k] === k)) return data;

  // Two local players can end up with the same id (e.g. a pilot downloaded
  // earlier and one created offline with the same name). Merge them,
  // keeping the furthest progress.
  const players: Player[] = [];
  for (const p of data.players) {
    const id = to(p.id);
    const twin = players.find((q) => q.id === id);
    if (twin) twin.unlockedStep = Math.max(twin.unlockedStep, p.unlockedStep);
    else players.push({ ...p, id });
  }
  const highScores: SaveData["highScores"] = {};
  for (const [level, list] of Object.entries(data.highScores)) {
    if (isLevelId(level))
      highScores[level] = (list ?? []).map((s) => ({
        ...s,
        playerId: to(s.playerId),
      }));
  }
  return {
    ...data,
    players,
    activePlayerId: data.activePlayerId && to(data.activePlayerId),
    highScores,
    pendingScores: data.pendingScores.map((s) => ({
      ...s,
      playerId: to(s.playerId),
    })),
    hiddenPilotIds: [...new Set(data.hiddenPilotIds.map(to))],
  };
}

function toSyncPilot(p: Player, now: Date): SyncPilot {
  return {
    id: p.id,
    name: p.name,
    created_at: Date.parse(p.createdAt) ? p.createdAt : now.toISOString(),
  };
}

function toSyncScore(s: PendingScore, now: Date): SyncScore {
  // A device clock set in the future shouldn't get the score rejected.
  const played = Date.parse(s.date);
  return {
    id: s.id,
    pilot_id: s.playerId,
    level: s.level,
    score: s.score,
    accuracy: typeof s.accuracy === "number" ? s.accuracy : null,
    played_at:
      played > now.getTime()
        ? now.toISOString()
        : new Date(played).toISOString(),
  };
}

/**
 * Step 1. Makes the save ready to upload:
 * - pilots with non-UUID ids (very old saves) get a UUID;
 * - local high scores with no id (saved before syncing existed) get one and
 *   are queued — this is the one-time upload of existing scores. Because the
 *   ids are saved before uploading, a retry re-sends the SAME ids and the
 *   server ignores the repeats: no duplicates.
 * - queued scores the server would reject are dropped, so they can't block
 *   syncing forever.
 */
export function prepareForSync(
  data: SaveData,
  makeId: () => string,
  now: Date,
): SaveData {
  const map: Record<string, string> = {};
  for (const p of data.players) if (!isUuid(p.id)) map[p.id] = makeId();
  let next = remapPilotIds(data, map);

  const playerIds = new Set(next.players.map((p) => p.id));
  const legacy: PendingScore[] = [];
  const highScores: SaveData["highScores"] = {};
  for (const level of LEVELS.map((l) => l.id)) {
    const list = next.highScores[level];
    if (!list) continue;
    highScores[level] = list.map((s): HighScore => {
      if (s.id) return s;
      const withId: PendingScore = { ...s, id: makeId() };
      if (playerIds.has(s.playerId) && s.score > 0) legacy.push(withId);
      return withId;
    });
  }

  const pendingScores = [...next.pendingScores, ...legacy].filter(
    (s) =>
      playerIds.has(s.playerId) &&
      parseScore(toSyncScore(s, now), now.getTime()),
  );
  next = { ...next, highScores, pendingScores };
  return next;
}

/** Step 2. Everything to send. Call after prepareForSync. */
export function buildSyncRequest(data: SaveData, now: Date): SyncRequest {
  const pilots = data.players
    .map((p) => toSyncPilot(p, now))
    .filter((p) => parsePilot(p, now.getTime()));
  const sent = new Set(pilots.map((p) => p.id));
  const scores = data.pendingScores
    .filter((s) => sent.has(s.playerId))
    .slice(0, MAX_SCORES_PER_SYNC)
    .map((s) => toSyncScore(s, now));
  return { pilots, scores };
}

/** Step 4. Merges the server's answer into the latest save. */
export function applySyncResponse(data: SaveData, res: SyncResponse): SaveData {
  let next = remapPilotIds(data, res.idMap);

  // If a pilot was re-created on this device after being removed, show it again.
  const reclaimed = new Set(Object.values(res.idMap));
  const hidden = next.hiddenPilotIds.filter((id) => !reclaimed.has(id));

  // Download pilots created on other devices.
  const have = new Set(next.players.map((p) => p.id));
  const names = new Set(next.players.map((p) => p.name.toLowerCase()));
  const downloaded: Player[] = res.pilots
    .filter(
      (p) =>
        !have.has(p.id) &&
        !hidden.includes(p.id) &&
        // Same name but a different id means it was added here mid-sync;
        // the next sync will merge them.
        !names.has(p.name.toLowerCase()),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      unlockedStep: 1,
      createdAt: p.created_at,
    }));

  const accepted = new Set(res.acceptedScoreIds);
  next = {
    ...next,
    players: [...next.players, ...downloaded],
    pendingScores: next.pendingScores.filter((s) => !accepted.has(s.id)),
    hiddenPilotIds: hidden,
  };
  return next;
}
