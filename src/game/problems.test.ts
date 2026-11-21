import { describe, expect, it } from "vitest";
import { LEVELS, type LevelId } from "./levels";
import {
  addWithoutCarry,
  generateDistractors,
  generateProblem,
  maxDistance,
  subtractSmallerFromLarger,
  type Problem,
} from "./problems";
import { seededRng } from "./rng";

const SAMPLES = 3000;

function samples(level: LevelId, seed = 1): Problem[] {
  const rng = seededRng(seed);
  return Array.from({ length: SAMPLES }, () => generateProblem(level, rng));
}

function compute(p: Problem): number {
  switch (p.op) {
    case "+":
      return p.a + p.b;
    case "−":
      return p.a - p.b;
    case "×":
      return p.a * p.b;
    case "÷":
      return p.a / p.b;
  }
}

const digits = (n: number) => String(n).length;
const onesOf = (n: number) => n % 10;
const tensOf = (n: number) => Math.floor(n / 10) % 10;

describe("every level", () => {
  it.each(LEVELS.map((l) => l.id))(
    "level %s: answers are correct whole numbers ≥ 0",
    (id) => {
      for (const p of samples(id)) {
        expect(p.answer).toBe(compute(p));
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(p.a) && Number.isInteger(p.b)).toBe(true);
      }
    },
  );

  it.each(LEVELS.map((l) => l.id))(
    "level %s: 3 unique distractors, whole, ≥ 0, never the answer",
    (id) => {
      const rng = seededRng(42);
      for (const p of samples(id, 7)) {
        const d = generateDistractors(p, id, 3, rng);
        expect(d).toHaveLength(3);
        expect(new Set(d).size).toBe(3);
        for (const n of d) {
          expect(n).not.toBe(p.answer);
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(0);
        }
      }
    },
  );

  it.each(LEVELS.map((l) => l.id))(
    "level %s: same seed gives the same problems",
    (id) => {
      expect(samples(id, 99).slice(0, 20)).toEqual(
        samples(id, 99).slice(0, 20),
      );
    },
  );
});

describe("level rules", () => {
  it("1: addition within 10", () => {
    for (const p of samples("1")) {
      expect(p.op).toBe("+");
      expect(p.answer).toBeLessThanOrEqual(10);
    }
  });

  it("2: subtraction within 10", () => {
    for (const p of samples("2")) {
      expect(p.op).toBe("−");
      expect(p.a).toBeLessThanOrEqual(10);
    }
  });

  it("3: + and − within 20, both kinds appear", () => {
    const ps = samples("3");
    for (const p of ps) {
      expect(["+", "−"]).toContain(p.op);
      expect(Math.max(p.a, p.b, p.answer)).toBeLessThanOrEqual(20);
    }
    expect(ps.some((p) => p.op === "+")).toBe(true);
    expect(ps.some((p) => p.op === "−")).toBe(true);
  });

  it("4: two-digit numbers, no regrouping", () => {
    for (const p of samples("4")) {
      expect(digits(p.a)).toBe(2);
      expect(digits(p.b)).toBe(2);
      if (p.op === "+") {
        expect(onesOf(p.a) + onesOf(p.b)).toBeLessThan(10);
        expect(p.answer).toBeLessThanOrEqual(99);
      } else {
        expect(onesOf(p.a)).toBeGreaterThanOrEqual(onesOf(p.b));
        expect(p.answer).toBeGreaterThan(0);
      }
    }
  });

  it("5: two-digit numbers, always regrouping, answers within 100", () => {
    for (const p of samples("5")) {
      expect(digits(p.a)).toBe(2);
      expect(digits(p.b)).toBe(2);
      expect(p.answer).toBeLessThanOrEqual(99);
      if (p.op === "+")
        expect(onesOf(p.a) + onesOf(p.b)).toBeGreaterThanOrEqual(10);
      else {
        expect(onesOf(p.a)).toBeLessThan(onesOf(p.b));
        expect(p.answer).toBeGreaterThan(0);
      }
    }
  });

  it("6: ×2, ×5, ×10 only", () => {
    for (const p of samples("6")) {
      expect(p.op).toBe("×");
      expect([p.a, p.b].some((n) => [2, 5, 10].includes(n))).toBe(true);
      expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(12);
    }
  });

  it("7: facts up to 12 × 12", () => {
    for (const p of samples("7")) {
      expect(p.op).toBe("×");
      expect(p.a).toBeLessThanOrEqual(12);
      expect(p.b).toBeLessThanOrEqual(12);
    }
  });

  it("8: division facts up to 144 ÷ 12, whole answers", () => {
    for (const p of samples("8")) {
      expect(p.op).toBe("÷");
      expect(p.a % p.b).toBe(0);
      expect(p.a).toBeLessThanOrEqual(144);
      expect(p.b).toBeLessThanOrEqual(12);
      expect(p.answer).toBeLessThanOrEqual(12);
    }
  });

  it("9a: 2-digit × 1-digit", () => {
    for (const p of samples("9a")) {
      expect(digits(p.a)).toBe(2);
      expect(digits(p.b)).toBe(1);
    }
  });

  it("9b: 2-digit × 2-digit", () => {
    for (const p of samples("9b")) {
      expect(digits(p.a)).toBe(2);
      expect(digits(p.b)).toBe(2);
    }
  });

  it("10a: 3-digit ÷ 1-digit, whole answers", () => {
    for (const p of samples("10a")) {
      expect(digits(p.a)).toBe(3);
      expect(digits(p.b)).toBe(1);
      expect(p.b).toBeGreaterThanOrEqual(2);
      expect(p.a % p.b).toBe(0);
    }
  });

  it("10b: 4-digit ÷ 2-digit, whole answers", () => {
    for (const p of samples("10b")) {
      expect(digits(p.a)).toBe(4);
      expect(digits(p.b)).toBe(2);
      expect(p.a % p.b).toBe(0);
    }
  });
});

describe("distractors are plausible", () => {
  it.each(["1", "2", "3", "4", "5", "6", "7", "8"] as const)(
    "level %s: every wrong answer is close enough to be believable",
    (id) => {
      const rng = seededRng(3);
      for (const p of samples(id)) {
        for (const d of generateDistractors(p, id, 3, rng)) {
          expect(Math.abs(d - p.answer)).toBeLessThanOrEqual(
            maxDistance(id, p.answer),
          );
        }
      }
    },
  );

  it("caps: ±3 at levels 1–2, ±5 at level 3, ±10+ for facts", () => {
    expect(maxDistance("1", 7)).toBe(3);
    expect(maxDistance("3", 15)).toBe(5);
    expect(maxDistance("8", 11)).toBe(10);
    expect(maxDistance("7", 144)).toBe(50);
  });

  it("multi-digit levels: distractors share the answer's last digit", () => {
    for (const id of ["5", "9a", "9b", "10a", "10b"] as const) {
      const rng = seededRng(5);
      for (const p of samples(id).filter((p) => p.answer >= 10)) {
        for (const d of generateDistractors(p, id, 3, rng)) {
          expect(onesOf(d)).toBe(onesOf(p.answer));
        }
      }
    }
  });

  it("times-table distractors include neighbouring facts", () => {
    const p: Problem = { a: 7, b: 8, op: "×", answer: 56 };
    const all = new Set<number>();
    for (let s = 0; s < 50; s++)
      generateDistractors(p, "7", 3, seededRng(s)).forEach((n) => all.add(n));
    expect([...all].some((n) => [48, 49, 63, 64].includes(n))).toBe(true);
  });
});

describe("mistake models", () => {
  it("forgetting to carry", () => {
    expect(addWithoutCarry(47, 38)).toBe(75);
    expect(tensOf(addWithoutCarry(19, 1))).toBe(1);
  });
  it("smaller-from-larger subtraction", () => {
    expect(subtractSmallerFromLarger(52, 17)).toBe(45);
  });
});
