/**
 * Everything saved on the device: players, unlocked levels, high scores, mute.
 * Pure functions that take the old save and return a new one, plus safe
 * load/save helpers for localStorage. Nothing ever leaves the device.
 */
import { LEVELS, isLevelId, type LevelId } from "./levels";

export const STORAGE_KEY = "math-rocket:v1";
export const MAX_HIGH_SCORES = 10;
export const MAX_NAME_LENGTH = 16;

export interface Player {
  id: string;
  name: string;
  /** Highest ladder step unlocked (1–12). */
  unlockedStep: number;
  createdAt: string;
}

export interface HighScore {
  playerId: string;
  name: string;
  score: number;
  level: LevelId;
  /** ISO date-time. */
  date: string;
}

export interface SaveData {
  version: 1;
  players: Player[];
  activePlayerId: string | null;
  muted: boolean;
  highScores: Partial<Record<LevelId, HighScore[]>>;
}

export function emptySave(): SaveData {
  return {
    version: 1,
    players: [],
    activePlayerId: null,
    muted: false,
    highScores: {},
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

/** Removes the player and their high scores. */
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
  };
}

export function selectPlayer(data: SaveData, id: string | null): SaveData {
  return { ...data, activePlayerId: id };
}

export function setMuted(data: SaveData, muted: boolean): SaveData {
  return { ...data, muted };
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
  playerId: string;
  level: LevelId;
  step: number;
  score: number;
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

/** Saves the score and unlocks the next step. Never lowers unlockedStep. */
export function recordRound(data: SaveData, r: RoundRecord): RoundOutcome {
  const player = data.players.find((p) => p.id === r.playerId);
  if (!player) return { data, rank: null, unlockedStep: null };

  const { data: withScore, rank } = insertHighScore(data, {
    playerId: player.id,
    name: player.name,
    score: r.score,
    level: r.level,
    date: r.date.toISOString(),
  });

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
    return {
      version: 1,
      players,
      activePlayerId,
      muted: v.muted === true,
      highScores,
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
