/**
 * Everything saved on the device: players, unlocked levels, high scores, mute,
 * plus what the family leaderboard sync needs (family code, scores waiting
 * to upload). Pure functions that take the old save and return a new one,
 * plus safe load/save helpers for localStorage.
 *
 * The device save is always the source of truth for play: the game never
 * waits for the network. See src/game/sync.ts for how it merges with the
 * shared leaderboard.
 */
import { LEVELS, isLevelId, type LevelId } from "./levels";

export const STORAGE_KEY = "math-rocket:v1";
export const MAX_HIGH_SCORES = 10;
export const MAX_NAME_LENGTH = 16;
/** Most scores kept waiting for upload while offline (newest kept). */
export const MAX_PENDING_SCORES = 200;

export interface Player {
  id: string;
  name: string;
  /** Highest ladder step unlocked (1–12). */
  unlockedStep: number;
  createdAt: string;
}

export interface HighScore {
  /**
   * Unique id (UUID), also used on the server so uploading twice is
   * harmless. Missing on scores saved before syncing existed.
   */
  id?: string;
  playerId: string;
  name: string;
  score: number;
  level: LevelId;
  /** ISO date-time. */
  date: string;
  /** Percent correct, 0–100. Missing on older scores. */
  accuracy?: number;
}

/** A round's score waiting to be uploaded to the family leaderboard. */
export type PendingScore = HighScore & { id: string };

export interface SaveData {
  version: 1;
  players: Player[];
  activePlayerId: string | null;
  muted: boolean;
  highScores: Partial<Record<LevelId, HighScore[]>>;
  /** Scores not yet confirmed by the server (the "outbox"). */
  pendingScores: PendingScore[];
  /** Family leaderboard code, or null if not entered on this device. */
  familyCode: string | null;
  /** True after "Not now" on the family code prompt. */
  familyPromptDismissed: boolean;
  /** Pilots removed on this device, so syncing doesn't download them again. */
  hiddenPilotIds: string[];
}

export function emptySave(): SaveData {
  return {
    version: 1,
    players: [],
    activePlayerId: null,
    muted: false,
    highScores: {},
    pendingScores: [],
    familyCode: null,
    familyPromptDismissed: false,
    hiddenPilotIds: [],
  };
}

// ---------- Players ----------

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

/** Returns an error message, or null if the name is fine. */
export function nameProblem(data: SaveData, raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return "Type a name first.";
  if (data.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return "That pilot already exists.";
  }
  return null;
}

export function addPlayer(
  data: SaveData,
  raw: string,
  id: string,
  now: Date,
): SaveData {
  if (nameProblem(data, raw)) return data;
  const player: Player = {
    id,
    name: cleanName(raw),
    unlockedStep: 1,
    createdAt: now.toISOString(),
  };
  return { ...data, players: [...data.players, player], activePlayerId: id };
}

/**
 * Removes the player and their high scores from this device. Their scores on
 * the family leaderboard stay; they're remembered as hidden so the next sync
 * doesn't bring them back.
 */
export function removePlayer(data: SaveData, id: string): SaveData {
  const highScores: SaveData["highScores"] = {};
  for (const [level, list] of Object.entries(data.highScores)) {
    if (isLevelId(level))
      highScores[level] = (list ?? []).filter((s) => s.playerId !== id);
  }
  return {
    ...data,
    players: data.players.filter((p) => p.id !== id),
    activePlayerId: data.activePlayerId === id ? null : data.activePlayerId,
    highScores,
    pendingScores: data.pendingScores.filter((s) => s.playerId !== id),
    hiddenPilotIds: data.hiddenPilotIds.includes(id)
      ? data.hiddenPilotIds
      : [...data.hiddenPilotIds, id],
  };
}

export function selectPlayer(data: SaveData, id: string | null): SaveData {
  return { ...data, activePlayerId: id };
}

export function setMuted(data: SaveData, muted: boolean): SaveData {
  return { ...data, muted };
}

// ---------- Family code ----------

export const MAX_FAMILY_CODE_LENGTH = 100;

/** Saves the family code (an empty code turns sharing off). */
export function setFamilyCode(data: SaveData, raw: string): SaveData {
  const code = raw.trim().slice(0, MAX_FAMILY_CODE_LENGTH);
  return { ...data, familyCode: code || null, familyPromptDismissed: true };
}

export function dismissFamilyPrompt(data: SaveData): SaveData {
  return { ...data, familyPromptDismissed: true };
}

// ---------- High scores ----------

export function scoresFor(data: SaveData, level: LevelId): HighScore[] {
  return data.highScores[level] ?? [];
}

/** Would this score make the top 10? (Ties with #10 don't bump it.) */
export function qualifies(
  data: SaveData,
  level: LevelId,
  score: number,
): boolean {
  if (score <= 0) return false;
  const list = scoresFor(data, level);
  return (
    list.length < MAX_HIGH_SCORES || score > (list[list.length - 1]?.score ?? 0)
  );
}

export function insertHighScore(
  data: SaveData,
  entry: HighScore,
): { data: SaveData; rank: number | null } {
  if (!qualifies(data, entry.level, entry.score)) return { data, rank: null };
  const list = [...scoresFor(data, entry.level), entry]
    .sort((x, y) => y.score - x.score || x.date.localeCompare(y.date))
    .slice(0, MAX_HIGH_SCORES);
  const index = list.indexOf(entry);
  return {
    data: { ...data, highScores: { ...data.highScores, [entry.level]: list } },
    rank: index === -1 ? null : index + 1,
  };
}

// ---------- Finishing a round ----------

export interface RoundRecord {
  /** New unique id (UUID) for this score. */
  scoreId: string;
  playerId: string;
  level: LevelId;
  step: number;
  score: number;
  /** Fraction correct, 0–1. */
  accuracy: number;
  earnedNextLevel: boolean;
  date: Date;
}

export interface RoundOutcome {
  data: SaveData;
  /** 1–10 if it made the high-score list. */
  rank: number | null;
  /** Step newly unlocked by this round, if any. */
  unlockedStep: number | null;
}

/**
 * Saves the score (locally, and in the upload outbox) and unlocks the next
 * step. Never lowers unlockedStep.
 */
export function recordRound(data: SaveData, r: RoundRecord): RoundOutcome {
  const player = data.players.find((p) => p.id === r.playerId);
  if (!player) return { data, rank: null, unlockedStep: null };

  const entry: PendingScore = {
    id: r.scoreId,
    playerId: player.id,
    name: player.name,
    score: r.score,
    level: r.level,
    date: r.date.toISOString(),
    accuracy: Math.round(Math.min(1, Math.max(0, r.accuracy)) * 100),
  };
  const { data: withLocal, rank } = insertHighScore(data, entry);
  // Every scoring round goes to the family board, even if it didn't make
  // this device's top 10 — it might still beat another device's scores.
  const withScore =
    r.score > 0
      ? {
          ...withLocal,
          pendingScores: [...withLocal.pendingScores, entry].slice(
            -MAX_PENDING_SCORES,
          ),
        }
      : withLocal;

  const target = Math.min(r.step + 1, LEVELS.length);
  const unlocks = r.earnedNextLevel && target > player.unlockedStep;
  const players = unlocks
    ? withScore.players.map((p) =>
        p.id === player.id ? { ...p, unlockedStep: target } : p,
      )
    : withScore.players;

  return {
    data: { ...withScore, players },
    rank,
    unlockedStep: unlocks ? target : null,
  };
}

export function bestScore(
  data: SaveData,
  playerId: string,
  level: LevelId,
): number | null {
  const mine = scoresFor(data, level).filter((s) => s.playerId === playerId);
  return mine[0]?.score ?? null;
}

// ---------- localStorage ----------

/** Turns whatever was stored into valid SaveData, dropping anything broken. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return emptySave();
  try {
    const v = JSON.parse(raw) as Partial<SaveData>;
    if (!v || v.version !== 1 || !Array.isArray(v.players)) return emptySave();
    const players = v.players.filter(
      (p): p is Player =>
        !!p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.unlockedStep === "number",
    );
    const highScores: SaveData["highScores"] = {};
    for (const [level, list] of Object.entries(v.highScores ?? {})) {
      if (isLevelId(level) && Array.isArray(list)) {
        highScores[level] = list.filter(
          (s): s is HighScore =>
            !!s && typeof s.score === "number" && typeof s.name === "string",
        );
      }
    }
    const activePlayerId = players.some((p) => p.id === v.activePlayerId)
      ? (v.activePlayerId ?? null)
      : null;
    const pendingScores = Array.isArray(v.pendingScores)
      ? v.pendingScores.filter(
          (s): s is PendingScore =>
            !!s &&
            typeof s.id === "string" &&
            typeof s.playerId === "string" &&
            typeof s.score === "number" &&
            typeof s.date === "string" &&
            isLevelId(s.level),
        )
      : [];
    return {
      version: 1,
      players,
      activePlayerId,
      muted: v.muted === true,
      highScores,
      pendingScores,
      familyCode:
        typeof v.familyCode === "string" && v.familyCode ? v.familyCode : null,
      familyPromptDismissed: v.familyPromptDismissed === true,
      hiddenPilotIds: Array.isArray(v.hiddenPilotIds)
        ? v.hiddenPilotIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return emptySave();
  }
}

/** Reads the save. Works even when storage is blocked (private mode). */
export function loadSave(storage: Pick<Storage, "getItem"> | null): SaveData {
  try {
    return parseSave(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return emptySave();
  }
}

/** Writes the save. Returns false if the device refused (full or blocked). */
export function writeSave(
  storage: Pick<Storage, "setItem"> | null,
  data: SaveData,
): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    return !!storage;
  } catch {
    return false;
  }
}
