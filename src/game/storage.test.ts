import { describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  addPlayer,
  bestScore,
  emptySave,
  insertHighScore,
  loadSave,
  nameProblem,
  parseSave,
  recordRound,
  removePlayer,
  writeSave,
  type SaveData,
} from "./storage";

const now = new Date("2026-11-21T10:00:00Z");

function withPilot(): SaveData {
  return addPlayer(emptySave(), "  Leo  ", "p1", now);
}

describe("players", () => {
  it("adds a trimmed name, unlocks level 1 and selects them", () => {
    const d = withPilot();
    expect(d.players[0]).toMatchObject({ name: "Leo", unlockedStep: 1 });
    expect(d.activePlayerId).toBe("p1");
  });
  it("rejects empty and duplicate names", () => {
    expect(nameProblem(emptySave(), "   ")).not.toBeNull();
    expect(nameProblem(withPilot(), "leo")).not.toBeNull();
    expect(addPlayer(withPilot(), "LEO", "p2", now).players).toHaveLength(1);
  });
  it("removing a player removes their scores", () => {
    let d = withPilot();
    d = recordRound(d, {
      playerId: "p1",
      level: "1",
      step: 1,
      score: 100,
      earnedNextLevel: false,
      date: now,
    }).data;
    d = removePlayer(d, "p1");
    expect(d.players).toHaveLength(0);
    expect(d.highScores["1"]).toEqual([]);
    expect(d.activePlayerId).toBeNull();
  });
});

describe("rounds and unlocking", () => {
  it("unlocks the next step after a passing round", () => {
    const out = recordRound(withPilot(), {
      playerId: "p1",
      level: "1",
      step: 1,
      score: 50,
      earnedNextLevel: true,
      date: now,
    });
    expect(out.unlockedStep).toBe(2);
    expect(out.data.players[0]?.unlockedStep).toBe(2);
  });
  it("never drops a player back", () => {
    let d = withPilot();
    d = { ...d, players: d.players.map((p) => ({ ...p, unlockedStep: 6 })) };
    const out = recordRound(d, {
      playerId: "p1",
      level: "2",
      step: 2,
      score: 10,
      earnedNextLevel: true,
      date: now,
    });
    expect(out.data.players[0]?.unlockedStep).toBe(6);
    expect(out.unlockedStep).toBeNull();
    const failed = recordRound(d, {
      playerId: "p1",
      level: "6",
      step: 6,
      score: 10,
      earnedNextLevel: false,
      date: now,
    });
    expect(failed.data.players[0]?.unlockedStep).toBe(6);
  });
  it("does not go past the last step", () => {
    let d = withPilot();
    d = { ...d, players: d.players.map((p) => ({ ...p, unlockedStep: 12 })) };
    const out = recordRound(d, {
      playerId: "p1",
      level: "10b",
      step: 12,
      score: 10,
      earnedNextLevel: true,
      date: now,
    });
    expect(out.data.players[0]?.unlockedStep).toBe(12);
  });
});

describe("high scores", () => {
  it("keeps the top 10, highest first, with rank", () => {
    let d = withPilot();
    for (let i = 1; i <= 12; i++) {
      d = insertHighScore(d, {
        playerId: "p1",
        name: "Leo",
        score: i * 10,
        level: "3",
        date: now.toISOString(),
      }).data;
    }
    const list = d.highScores["3"]!;
    expect(list).toHaveLength(10);
    expect(list[0]?.score).toBe(120);
    expect(list[9]?.score).toBe(30);
    const low = insertHighScore(d, {
      playerId: "p1",
      name: "Leo",
      score: 30,
      level: "3",
      date: now.toISOString(),
    });
    expect(low.rank).toBeNull();
    const high = insertHighScore(d, {
      playerId: "p1",
      name: "Leo",
      score: 115,
      level: "3",
      date: now.toISOString(),
    });
    expect(high.rank).toBe(2);
    expect(bestScore(high.data, "p1", "3")).toBe(120);
  });
  it("ignores zero scores", () => {
    expect(
      insertHighScore(withPilot(), {
        playerId: "p1",
        name: "Leo",
        score: 0,
        level: "1",
        date: "",
      }).rank,
    ).toBeNull();
  });
});

describe("saving on the device", () => {
  it("round-trips through storage", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const d = withPilot();
    expect(writeSave(storage, d)).toBe(true);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    expect(loadSave(storage)).toEqual(d);
  });
  it("survives broken data and blocked storage", () => {
    expect(parseSave("{not json")).toEqual(emptySave());
    expect(parseSave(JSON.stringify({ version: 99 }))).toEqual(emptySave());
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadSave(throwing)).toEqual(emptySave());
    expect(writeSave(throwing, emptySave())).toBe(false);
    expect(loadSave(null)).toEqual(emptySave());
  });
});
