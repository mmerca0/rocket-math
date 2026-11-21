import { describe, expect, it } from "vitest";
import { ASTEROIDS_PER_WAVE, getLevel } from "./levels";
import { seededRng } from "./rng";
import {
  createRound,
  createWave,
  roundReducer,
  type RoundState,
} from "./round";

const tapLevel = getLevel("3");
const typeLevel = getLevel("9a");

function start(level = tapLevel): RoundState {
  return createRound(level, seededRng(1));
}
const answerOf = (s: RoundState) => s.wave.asteroids.find((a) => a.isAnswer)!;
const wrongOf = (s: RoundState) => s.wave.asteroids.find((a) => !a.isAnswer)!;

describe("waves", () => {
  it("tap waves have 4 asteroids, exactly one right answer, in different lanes", () => {
    const rng = seededRng(2);
    for (let i = 0; i < 200; i++) {
      const w = createWave(tapLevel, i, rng);
      expect(w.asteroids).toHaveLength(ASTEROIDS_PER_WAVE);
      expect(w.asteroids.filter((a) => a.isAnswer)).toHaveLength(1);
      expect(answerOf({ wave: w } as RoundState).value).toBe(w.problem.answer);
      expect(new Set(w.asteroids.map((a) => a.lane)).size).toBe(4);
      expect(new Set(w.asteroids.map((a) => a.value)).size).toBe(4);
    }
  });
  it("type waves have one boss asteroid", () => {
    expect(createWave(typeLevel, 1, seededRng(1)).asteroids).toHaveLength(1);
  });
});

describe("tap mode", () => {
  it("right tap scores and ends the wave", () => {
    const s = roundReducer(start(), {
      type: "tap",
      asteroidId: answerOf(start()).id,
      fallLeft: 1,
    });
    expect(s.stats.correct).toBe(1);
    expect(s.stats.score).toBeGreaterThan(0);
    expect(s.status).toBe("resolving");
    expect(s.message?.kind).toBe("good");
  });

  it("wrong tap costs a shield and breaks only that asteroid", () => {
    const s0 = start();
    const s = roundReducer(s0, {
      type: "tap",
      asteroidId: wrongOf(s0).id,
      fallLeft: 1,
    });
    expect(s.shields).toBe(2);
    expect(s.stats.wrong).toBe(1);
    expect(s.status).toBe("playing");
    expect(s.wave.asteroids.find((a) => a.id === wrongOf(s0).id)?.state).toBe(
      "broken",
    );
    // Tapping the broken one again does nothing.
    expect(
      roundReducer(s, { type: "tap", asteroidId: wrongOf(s0).id, fallLeft: 1 }),
    ).toBe(s);
  });

  it("a wrong asteroid landing costs nothing", () => {
    const s0 = start();
    const s = roundReducer(s0, { type: "landed", asteroidId: wrongOf(s0).id });
    expect(s.shields).toBe(3);
    expect(s.stats.missed).toBe(0);
  });

  it("the right asteroid landing costs a shield and counts as missed", () => {
    const s0 = start();
    const s = roundReducer(s0, { type: "landed", asteroidId: answerOf(s0).id });
    expect(s.shields).toBe(2);
    expect(s.stats.missed).toBe(1);
    expect(s.status).toBe("resolving");
    expect(s.message?.text).toContain(String(s0.wave.problem.answer));
  });

  it("three lost shields end the round", () => {
    let s = start();
    for (let i = 0; i < 3; i++) {
      s = roundReducer(s, { type: "landed", asteroidId: answerOf(s).id });
      if (s.status === "resolving")
        s = roundReducer(s, {
          type: "nextWave",
          wave: createWave(tapLevel, i + 2, seededRng(i)),
        });
    }
    expect(s.shields).toBe(0);
    expect(s.status).toBe("over");
    expect(s.endReason).toBe("shields");
  });

  it("the clock ends the round; pausing stops the clock", () => {
    let s = roundReducer(start(), { type: "pause" });
    s = roundReducer(s, { type: "tick", ms: 200_000 });
    expect(s.status).toBe("playing");
    s = roundReducer(s, { type: "resume" });
    s = roundReducer(s, { type: "tick", ms: 200_000 });
    expect(s.status).toBe("over");
    expect(s.endReason).toBe("time");
  });

  it("taps are ignored while paused", () => {
    const s0 = roundReducer(start(), { type: "pause" });
    expect(
      roundReducer(s0, {
        type: "tap",
        asteroidId: answerOf(s0).id,
        fallLeft: 1,
      }),
    ).toBe(s0);
  });
});

describe("type mode", () => {
  it("has no clock and finishes after 5 problems", () => {
    let s = start(typeLevel);
    expect(s.timeLeftMs).toBeNull();
    for (let i = 0; i < 5; i++) {
      for (const ch of String(s.wave.problem.answer))
        s = roundReducer(s, { type: "key", key: ch });
      s = roundReducer(s, { type: "fire", fallLeft: 0.5 });
      if (i < 4) {
        expect(s.status).toBe("resolving");
        s = roundReducer(s, {
          type: "nextWave",
          wave: createWave(typeLevel, i + 2, seededRng(i)),
        });
      }
    }
    expect(s.status).toBe("over");
    expect(s.endReason).toBe("done");
    expect(s.stats.correct).toBe(5);
  });

  it("wrong answer costs a shield and clears the input", () => {
    let s = start(typeLevel);
    const wrong = String(s.wave.problem.answer + 10);
    for (const ch of wrong) s = roundReducer(s, { type: "key", key: ch });
    s = roundReducer(s, { type: "fire", fallLeft: 0.5 });
    expect(s.shields).toBe(2);
    expect(s.input).toBe("");
    expect(s.status).toBe("playing");
  });

  it("keypad: backspace, no leading zeros, max 6 digits", () => {
    let s = start(typeLevel);
    for (const k of ["0", "0", "7", "back", "1", "2", "3", "4", "5", "6", "7"])
      s = roundReducer(s, { type: "key", key: k });
    expect(s.input).toBe("123456");
    expect(
      roundReducer(start(typeLevel), { type: "fire", fallLeft: 1 }).stats.wrong,
    ).toBe(0); // empty fire ignored
  });
});
