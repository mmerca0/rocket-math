import { describe, expect, it } from "vitest";
import { getLevel } from "./levels";
import {
  EMPTY_STATS,
  accuracy,
  addCorrect,
  addMissed,
  addWrong,
  earnedNextLevel,
  pointsForCorrect,
  type RoundStats,
} from "./scoring";

const l1 = getLevel("1");
const l9a = getLevel("9a");

function stats(correct: number, wrong: number, missed: number): RoundStats {
  return { ...EMPTY_STATS, correct, wrong, missed };
}

describe("points", () => {
  it("scales with the ladder step", () => {
    expect(pointsForCorrect(l1, 0, 1)).toBe(10);
    expect(pointsForCorrect(getLevel("10b"), 0, 1)).toBe(120);
  });
  it("adds up to 50% for answering fast", () => {
    expect(pointsForCorrect(l1, 1, 1)).toBe(15);
    expect(pointsForCorrect(l1, 5, 1)).toBe(15); // clamped
  });
  it("adds a streak bonus every 5 in a row", () => {
    expect(pointsForCorrect(l1, 0, 5)).toBe(30);
    expect(pointsForCorrect(l1, 0, 6)).toBe(10);
  });
  it("mistakes never lower the score but reset the streak", () => {
    let s = addCorrect(EMPTY_STATS, l1, 0);
    s = addCorrect(s, l1, 0);
    const before = s.score;
    s = addWrong(s);
    expect(s.score).toBe(before);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
    s = addMissed(s);
    expect(s.score).toBe(before);
    expect(s.missed).toBe(1);
  });
});

describe("accuracy", () => {
  it("is 0 when nothing attempted", () => {
    expect(accuracy(EMPTY_STATS)).toBe(0);
  });
  it("counts wrong taps and missed asteroids", () => {
    expect(accuracy(stats(8, 1, 1))).toBe(0.8);
  });
});

describe("moving up a level", () => {
  it("needs ≥ 80% accuracy", () => {
    expect(earnedNextLevel(stats(8, 2, 0), l1, 1)).toBe(true);
    expect(earnedNextLevel(stats(7, 2, 1), l1, 1)).toBe(false);
  });
  it("needs at least 8 problems in tap mode", () => {
    expect(earnedNextLevel(stats(7, 0, 0), l1, 3)).toBe(false);
  });
  it("needs all 5 problems in type mode", () => {
    expect(earnedNextLevel(stats(4, 1, 0), l9a, 2)).toBe(false);
    expect(earnedNextLevel(stats(5, 1, 0), l9a, 2)).toBe(true);
    expect(earnedNextLevel(stats(4, 0, 1), l9a, 2)).toBe(true);
  });
  it("never when shields ran out", () => {
    expect(earnedNextLevel(stats(20, 0, 0), l1, 0)).toBe(false);
  });
});
