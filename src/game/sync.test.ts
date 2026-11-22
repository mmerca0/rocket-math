import { describe, expect, it } from "vitest";
import type { SyncResponse } from "@/lib/leaderboard/schema";
import { applySyncResponse, buildSyncRequest, prepareForSync } from "./sync";
import {
  addPlayer,
  emptySave,
  insertHighScore,
  recordRound,
  removePlayer,
  type SaveData,
} from "./storage";

const now = new Date("2026-11-22T10:00:00Z");
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const S1 = "00000000-0000-4000-8000-000000000001";

/** Predictable ids for tests: id-1, id-2… padded into UUID shape. */
function idMaker() {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

function withLeo(id = A): SaveData {
  return addPlayer(emptySave(), "Leo", id, now);
}

function response(partial: Partial<SyncResponse>): SyncResponse {
  return { pilots: [], idMap: {}, acceptedScoreIds: [], ...partial };
}

describe("first sync of an existing device", () => {
  it("gives old scores ids and queues them exactly once", () => {
    let d = withLeo();
    // A score saved before syncing existed: no id, no accuracy.
    d = insertHighScore(d, {
      playerId: A,
      name: "Leo",
      score: 120,
      level: "2",
      date: now.toISOString(),
    }).data;

    const once = prepareForSync(d, idMaker(), now);
    expect(once.pendingScores).toHaveLength(1);
    const id = once.pendingScores[0]!.id;
    expect(once.highScores["2"]![0]!.id).toBe(id);

    // Preparing again (e.g. the upload failed) must not queue it twice
    // or change its id — that's what prevents duplicates on the server.
    const twice = prepareForSync(once, idMaker(), now);
    expect(twice.pendingScores.map((s) => s.id)).toEqual([id]);

    const req = buildSyncRequest(twice, now);
    expect(req.scores[0]).toMatchObject({ id, accuracy: null, score: 120 });
  });

  it("swaps old non-UUID pilot ids for UUIDs everywhere", () => {
    let d = withLeo("p1");
    d = recordRound(d, {
      scoreId: S1,
      playerId: "p1",
      level: "1",
      step: 1,
      score: 50,
      accuracy: 1,
      earnedNextLevel: false,
      date: now,
    }).data;
    const out = prepareForSync(d, idMaker(), now);
    const newId = out.players[0]!.id;
    expect(newId).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.activePlayerId).toBe(newId);
    expect(out.pendingScores[0]!.playerId).toBe(newId);
    expect(out.highScores["1"]![0]!.playerId).toBe(newId);
  });
});

describe("building the request", () => {
  it("sends every pilot and only queued scores", () => {
    let d = withLeo();
    d = recordRound(d, {
      scoreId: S1,
      playerId: A,
      level: "9b",
      step: 10,
      score: 300,
      accuracy: 0.8,
      earnedNextLevel: true,
      date: now,
    }).data;
    const req = buildSyncRequest(prepareForSync(d, idMaker(), now), now);
    expect(req.pilots).toEqual([
      { id: A, name: "Leo", created_at: now.toISOString() },
    ]);
    expect(req.scores).toEqual([
      {
        id: S1,
        pilot_id: A,
        level: "9b",
        score: 300,
        accuracy: 80,
        played_at: now.toISOString(),
      },
    ]);
  });

  it("pulls future dates (wrong device clock) back to now", () => {
    let d = withLeo();
    d = recordRound(d, {
      scoreId: S1,
      playerId: A,
      level: "1",
      step: 1,
      score: 10,
      accuracy: 1,
      earnedNextLevel: false,
      date: new Date("2030-01-01T00:00:00Z"),
    }).data;
    const req = buildSyncRequest(prepareForSync(d, idMaker(), now), now);
    expect(req.scores[0]!.played_at).toBe(now.toISOString());
  });
});

describe("applying the server's answer", () => {
  it("adopts the server id for a same-name pilot", () => {
    let d = withLeo(A);
    d = recordRound(d, {
      scoreId: S1,
      playerId: A,
      level: "1",
      step: 1,
      score: 10,
      accuracy: 1,
      earnedNextLevel: true,
      date: now,
    }).data;
    const out = applySyncResponse(
      d,
      response({
        pilots: [{ id: B, name: "Leo", created_at: now.toISOString() }],
        idMap: { [A]: B },
      }),
    );
    expect(out.players).toHaveLength(1);
    expect(out.players[0]).toMatchObject({ id: B, unlockedStep: 2 });
    expect(out.activePlayerId).toBe(B);
    expect(out.pendingScores[0]!.playerId).toBe(B);
  });

  it("downloads pilots created on other devices", () => {
    const out = applySyncResponse(
      withLeo(A),
      response({
        pilots: [
          { id: A, name: "Leo", created_at: now.toISOString() },
          { id: B, name: "Mia", created_at: now.toISOString() },
        ],
      }),
    );
    expect(out.players.map((p) => p.name)).toEqual(["Leo", "Mia"]);
    expect(out.players[1]!.unlockedStep).toBe(1);
  });

  it("doesn't bring back a pilot removed on this device", () => {
    const d = removePlayer(withLeo(A), A);
    const out = applySyncResponse(
      d,
      response({
        pilots: [{ id: A, name: "Leo", created_at: now.toISOString() }],
      }),
    );
    expect(out.players).toHaveLength(0);
  });

  it("clears uploaded scores from the queue and keeps the rest", () => {
    let d = withLeo(A);
    for (const [id, score] of [
      [S1, 10],
      [B, 20],
    ] as const) {
      d = recordRound(d, {
        scoreId: id,
        playerId: A,
        level: "1",
        step: 1,
        score,
        accuracy: 1,
        earnedNextLevel: false,
        date: now,
      }).data;
    }
    const out = applySyncResponse(d, response({ acceptedScoreIds: [S1] }));
    expect(out.pendingScores.map((s) => s.id)).toEqual([B]);
  });
});
