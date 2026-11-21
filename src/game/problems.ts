/**
 * Problem generator and plausible wrong answers ("distractors").
 * Plain functions, no React — tested in problems.test.ts.
 */
import type { LevelId } from "./levels";
import { pick, randInt, shuffle, type Rng } from "./rng";

export type Operator = "+" | "−" | "×" | "÷";

export interface Problem {
  a: number;
  b: number;
  op: Operator;
  answer: number;
}

/** "7 + 3", "84 ÷ 7" — used on screen and for screen readers. */
export function problemText(p: Problem): string {
  return `${p.a} ${p.op} ${p.b}`;
}

function add(a: number, b: number): Problem {
  return { a, b, op: "+", answer: a + b };
}
function sub(a: number, b: number): Problem {
  return { a, b, op: "−", answer: a - b };
}
function mul(a: number, b: number): Problem {
  return { a, b, op: "×", answer: a * b };
}
/** Built from divisor × quotient, so the answer is always a whole number. */
function div(divisor: number, quotient: number): Problem {
  return { a: divisor * quotient, b: divisor, op: "÷", answer: quotient };
}

const ones = (n: number) => n % 10;
const tens = (n: number) => Math.floor(n / 10);

/** Random problem for a level. */
export function generateProblem(level: LevelId, rng: Rng): Problem {
  switch (level) {
    case "1": {
      // Addition within 10 (sum 2–10, no "+ 0").
      const sum = randInt(rng, 2, 10);
      const a = randInt(rng, 1, sum - 1);
      return add(a, sum - a);
    }
    case "2": {
      // Subtraction within 10 (no "− 0", answers 1–9).
      const a = randInt(rng, 2, 10);
      return sub(a, randInt(rng, 1, a - 1));
    }
    case "3": {
      // Addition and subtraction within 20, mostly crossing 10.
      if (rng() < 0.5) {
        const sum = randInt(rng, 11, 20);
        const a = randInt(rng, sum - 10, 10);
        return add(a, sum - a);
      }
      const a = randInt(rng, 11, 20);
      return sub(a, randInt(rng, a - 10, a - 1));
    }
    case "4": {
      // Two-digit, no regrouping: every column stays under 10 / never borrows.
      if (rng() < 0.5) {
        const at = randInt(rng, 1, 8);
        const bt = randInt(rng, 1, 9 - at);
        const ao = randInt(rng, 0, 9);
        const bo = randInt(rng, 0, 9 - ao);
        return add(at * 10 + ao, bt * 10 + bo);
      }
      const at = randInt(rng, 2, 9);
      const bt = randInt(rng, 1, at - 1);
      const ao = randInt(rng, 0, 9);
      const bo = randInt(rng, 0, ao);
      return sub(at * 10 + ao, bt * 10 + bo);
    }
    case "5": {
      // Two-digit with regrouping, answers within 100.
      if (rng() < 0.5) {
        const ao = randInt(rng, 1, 9);
        const bo = randInt(rng, 10 - ao, 9); // ones add up to 10 or more → carry
        const at = randInt(rng, 1, 7);
        const bt = randInt(rng, 1, 8 - at); // keeps the sum ≤ 99
        return add(at * 10 + ao, bt * 10 + bo);
      }
      const ao = randInt(rng, 0, 8);
      const bo = randInt(rng, ao + 1, 9); // top ones digit smaller → borrow
      const at = randInt(rng, 2, 9);
      const bt = randInt(rng, 1, at - 1);
      return sub(at * 10 + ao, bt * 10 + bo);
    }
    case "6": {
      const fact = pick(rng, [2, 5, 10]);
      const other = randInt(rng, 1, 12);
      return rng() < 0.5 ? mul(fact, other) : mul(other, fact);
    }
    case "7":
      return mul(randInt(rng, 2, 12), randInt(rng, 2, 12));
    case "8":
      return div(randInt(rng, 2, 12), randInt(rng, 2, 12));
    case "9a":
      return mul(randInt(rng, 12, 99), randInt(rng, 2, 9));
    case "9b":
      return mul(randInt(rng, 11, 99), randInt(rng, 11, 99));
    case "10a": {
      // 3-digit ÷ 1-digit.
      const d = randInt(rng, 2, 9);
      return div(d, randInt(rng, Math.ceil(100 / d), Math.floor(999 / d)));
    }
    case "10b": {
      // 4-digit ÷ 2-digit.
      const d = randInt(rng, 11, 99);
      return div(d, randInt(rng, Math.ceil(1000 / d), Math.floor(9999 / d)));
    }
  }
}

/** Common mistake: adding each column but forgetting to carry. */
export function addWithoutCarry(a: number, b: number): number {
  let result = 0;
  let place = 1;
  while (a > 0 || b > 0) {
    result += ((ones(a) + ones(b)) % 10) * place;
    a = tens(a);
    b = tens(b);
    place *= 10;
  }
  return result;
}

/** Common mistake: in each column, take the smaller digit from the bigger one. */
export function subtractSmallerFromLarger(a: number, b: number): number {
  let result = 0;
  let place = 1;
  while (a > 0 || b > 0) {
    result += Math.abs(ones(a) - ones(b)) * place;
    a = tens(a);
    b = tens(b);
    place *= 10;
  }
  return result;
}

/**
 * Levels where the wrong answers share the right answer's last digit,
 * so you can't skip the work by checking only the ones digit.
 */
const SAME_LAST_DIGIT: ReadonlySet<LevelId> = new Set([
  "5",
  "9a",
  "9b",
  "10a",
  "10b",
]);

/**
 * How far a wrong answer may be from the right one. Keeps every option
 * believable, so none can be ruled out at a glance (e.g. 5 + 3 → 18,
 * or 77 ÷ 7 → 70). Typed levels (9a–10b) don't show options, so no limit.
 */
export function maxDistance(level: LevelId, answer: number): number {
  switch (level) {
    case "1":
    case "2":
      return 3;
    case "3":
      return 5;
    case "5":
      return 20;
    case "4":
    case "6":
    case "7":
    case "8":
      return Math.max(10, Math.round(answer * 0.35));
    default:
      return Infinity;
  }
}

/** Wrong answers a child might actually reach, based on real mistakes. */
function mistakeAnswers(p: Problem): number[] {
  const { a, b, answer } = p;
  switch (p.op) {
    case "+":
      return [
        answer + 1,
        answer - 1,
        answer + 2,
        answer - 2,
        Math.abs(a - b),
        addWithoutCarry(a, b),
        answer + 10,
        answer - 10,
      ];
    case "−":
      return [
        answer + 1,
        answer - 1,
        answer + 2,
        answer - 2,
        a + b,
        subtractSmallerFromLarger(a, b),
        answer + 10,
        answer - 10,
      ];
    case "×":
      return [
        (a + 1) * b,
        (a - 1) * b,
        a * (b + 1),
        a * (b - 1),
        a + b,
        answer + 10,
        answer - 10,
        answer + 1,
        answer - 1,
      ];
    case "÷":
      return [
        answer + 1,
        answer - 1,
        answer + 2,
        answer - 2,
        answer + 10,
        answer - 10,
        b,
        a - b,
      ];
  }
}

/**
 * `count` unique wrong answers close to the right one.
 * Guarantees: whole numbers, never negative, never equal to the answer.
 */
export function generateDistractors(
  p: Problem,
  level: LevelId,
  count: number,
  rng: Rng,
): number[] {
  const sameDigit = SAME_LAST_DIGIT.has(level) && p.answer >= 10;
  const limit = maxDistance(level, p.answer);
  const ok = (n: number) =>
    Number.isInteger(n) &&
    n >= 0 &&
    n !== p.answer &&
    Math.abs(n - p.answer) <= limit &&
    (!sameDigit || ones(n) === ones(p.answer));

  const chosen: number[] = [];
  const take = (n: number) => {
    if (chosen.length < count && ok(n) && !chosen.includes(n)) chosen.push(n);
  };

  // 1) Real-mistake answers, in random order.
  shuffle(rng, mistakeAnswers(p)).forEach(take);

  // 2) Fill up with the nearest numbers (±10s when matching the last digit).
  const step = sameDigit ? 10 : 1;
  for (let k = 1; chosen.length < count && k * step <= limit; k++) {
    const offsets = shuffle(rng, [k * step, -k * step]);
    offsets.forEach((o) => take(p.answer + o));
  }
  // 3) Safety net (never expected): numbers just above the answer.
  for (let k = 1; chosen.length < count; k++) {
    const n = p.answer + k * step;
    if (!chosen.includes(n)) chosen.push(n);
  }
  return chosen;
}
