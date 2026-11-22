/**
 * Talks to the family leaderboard API from the browser.
 *
 * Rules: never block play, never throw. Every call returns a simple result
 * ("ok", "offline", "bad-code"...) and the game carries on with the scores
 * saved on the device. Anything not uploaded stays queued for next time.
 */
import type { LevelId } from "@/game/levels";
import {
  applySyncResponse,
  buildSyncRequest,
  prepareForSync,
} from "@/game/sync";
import {
  FAMILY_CODE_HEADER,
  parseLeaderboardResponse,
  parseSyncResponse,
  type LeaderboardEntry,
} from "@/lib/leaderboard/schema";
import { newId } from "./id";
import { getSave, updateSave } from "./useSaveData";

/**
 * - "off": no family code on this device
 * - "bad-code": the server rejected the family code
 * - "offline": network/server/database problem — try again later
 */
export type SyncResult = "ok" | "off" | "offline" | "bad-code";

const TIMEOUT_MS = 10_000;

function headers(code: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    // Encoded so codes with emoji or accents survive HTTP headers.
    [FAMILY_CODE_HEADER]: encodeURIComponent(code),
  };
}

function failure(status: number): SyncResult {
  return status === 401 ? "bad-code" : "offline";
}

let running: Promise<SyncResult> | null = null;
let again = false;

/**
 * Uploads pilots + queued scores and downloads other devices' pilots.
 * Safe to call often: overlapping calls are merged into one follow-up run.
 */
export function syncNow(): Promise<SyncResult> {
  if (running) {
    again = true;
    return running;
  }
  running = runSync().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

async function runSync(): Promise<SyncResult> {
  try {
    const code = getSave().familyCode;
    if (!code) return "off";

    // Save ids BEFORE uploading so a retry re-sends the same ids.
    updateSave((d) => prepareForSync(d, newId, new Date()));
    const request = buildSyncRequest(getSave(), new Date());

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: headers(code),
      body: JSON.stringify(request),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return failure(res.status);
    const body = parseSyncResponse(await res.json());
    if (!body) return "offline";
    // The code was changed while we waited: ignore this answer.
    if (getSave().familyCode !== code) return "offline";

    updateSave((d) => applySyncResponse(d, body));
    return "ok";
  } catch {
    return "offline";
  }
}

export type LeaderboardResult =
  | { kind: "ok"; scores: LeaderboardEntry[] }
  | { kind: Exclude<SyncResult, "ok"> };

/** The family's top 10 for a level. Syncs first so new scores show up. */
export async function fetchLeaderboard(
  level: LevelId,
): Promise<LeaderboardResult> {
  const synced = await syncNow();
  if (synced === "off" || synced === "bad-code") return { kind: synced };
  try {
    const code = getSave().familyCode;
    if (!code) return { kind: "off" };
    const res = await fetch(
      `/api/leaderboard?level=${encodeURIComponent(level)}`,
      {
        headers: headers(code),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return { kind: failure(res.status) as "offline" | "bad-code" };
    const scores = parseLeaderboardResponse(await res.json());
    return scores ? { kind: "ok", scores } : { kind: "offline" };
  } catch {
    return { kind: "offline" };
  }
}
