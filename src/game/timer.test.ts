import { describe, expect, it } from "vitest";
import { TAP_ROUND_SECONDS } from "./levels";
import { timerBar } from "./timer";

const TOTAL = TAP_ROUND_SECONDS * 1000;
const s = (seconds: number) => seconds * 1000;

describe("timer bar", () => {
  it("is full at the start and empty at the end", () => {
    expect(timerBar(TOTAL, TOTAL).percent).toBe(100);
    expect(timerBar(TOTAL / 2, TOTAL).percent).toBe(50);
    expect(timerBar(0, TOTAL).percent).toBe(0);
  });

  it("never goes below 0% or above 100%", () => {
    expect(timerBar(-500, TOTAL).percent).toBe(0);
    expect(timerBar(TOTAL + 5000, TOTAL).percent).toBe(100);
    expect(timerBar(1000, 0).percent).toBe(0);
  });

  it("goes green → yellow (30 s left) → red (15 s left)", () => {
    expect(timerBar(TOTAL, TOTAL).color).toBe("green");
    expect(timerBar(s(30.1), TOTAL).color).toBe("green");
    expect(timerBar(s(30), TOTAL).color).toBe("yellow");
    expect(timerBar(s(15.1), TOTAL).color).toBe("yellow");
    expect(timerBar(s(15), TOTAL).color).toBe("red");
    expect(timerBar(0, TOTAL).color).toBe("red");
  });

  it("pulses only in the final 10 seconds, and stops when time is up", () => {
    expect(timerBar(s(10.1), TOTAL).pulse).toBe(false);
    expect(timerBar(s(10), TOTAL).pulse).toBe(true);
    expect(timerBar(s(0.2), TOTAL).pulse).toBe(true);
    expect(timerBar(0, TOTAL).pulse).toBe(false);
  });
});
