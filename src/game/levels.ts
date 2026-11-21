/**
 * The difficulty ladder. Levels 9 and 10 are split into "a" and "b" steps,
 * so there are 12 steps in total, each with the same 80% rule.
 *
 * Tweak `fallSeconds` here if asteroids feel too fast or too slow.
 */

export type LevelId =
  "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9a" | "9b" | "10a" | "10b";

/** "tap" = pick the right asteroid. "type" = boss asteroid + number keypad. */
export type AnswerMode = "tap" | "type";

export interface Level {
  id: LevelId;
  /** Position on the ladder, 1–12. Also the points multiplier. */
  step: number;
  /** Short planet name shown on the map (our own invention). */
  planet: string;
  /** What the level practises, in kid-friendly words. */
  skill: string;
  /** Planet colour on the map. */
  color: string;
  mode: AnswerMode;
  /** Seconds for an asteroid to fall from the top to the bottom. */
  fallSeconds: number;
  /** Multi-digit levels show the problem extra large for working on paper. */
  bigProblem: boolean;
}

export const LEVELS: readonly Level[] = [
  {
    id: "1",
    step: 1,
    planet: "Pebble Moon",
    skill: "Adding to 10",
    color: "#38bdf8",
    mode: "tap",
    fallSeconds: 9,
    bigProblem: false,
  },
  {
    id: "2",
    step: 2,
    planet: "Dusty Dot",
    skill: "Taking away from 10",
    color: "#34d399",
    mode: "tap",
    fallSeconds: 9,
    bigProblem: false,
  },
  {
    id: "3",
    step: 3,
    planet: "Comet Corner",
    skill: "Adding and taking away to 20",
    color: "#a3e635",
    mode: "tap",
    fallSeconds: 10,
    bigProblem: false,
  },
  {
    id: "4",
    step: 4,
    planet: "Twin Rings",
    skill: "Two-digit + and −",
    color: "#facc15",
    mode: "tap",
    fallSeconds: 15,
    bigProblem: true,
  },
  {
    id: "5",
    step: 5,
    planet: "Carry Crater",
    skill: "Two-digit + and − with carrying",
    color: "#fb923c",
    mode: "tap",
    fallSeconds: 18,
    bigProblem: true,
  },
  {
    id: "6",
    step: 6,
    planet: "Starfish Nebula",
    skill: "Times 2, 5 and 10",
    color: "#f472b6",
    mode: "tap",
    fallSeconds: 10,
    bigProblem: false,
  },
  {
    id: "7",
    step: 7,
    planet: "Grid Giant",
    skill: "All times tables to 12",
    color: "#c084fc",
    mode: "tap",
    fallSeconds: 11,
    bigProblem: false,
  },
  {
    id: "8",
    step: 8,
    planet: "Splitter Station",
    skill: "Division facts to 144",
    color: "#818cf8",
    mode: "tap",
    fallSeconds: 12,
    bigProblem: false,
  },
  {
    id: "9a",
    step: 9,
    planet: "Boulder Belt",
    skill: "2-digit × 1-digit",
    color: "#2dd4bf",
    mode: "type",
    fallSeconds: 45,
    bigProblem: true,
  },
  {
    id: "9b",
    step: 10,
    planet: "Mega Boulder",
    skill: "2-digit × 2-digit",
    color: "#14b8a6",
    mode: "type",
    fallSeconds: 80,
    bigProblem: true,
  },
  {
    id: "10a",
    step: 11,
    planet: "Long Way Nebula",
    skill: "3-digit ÷ 1-digit",
    color: "#f87171",
    mode: "type",
    fallSeconds: 60,
    bigProblem: true,
  },
  {
    id: "10b",
    step: 12,
    planet: "Far Frontier",
    skill: "4-digit ÷ 2-digit",
    color: "#ef4444",
    mode: "type",
    fallSeconds: 100,
    bigProblem: true,
  },
];

/** Tap rounds last 2 minutes. */
export const TAP_ROUND_SECONDS = 120;
/** Type (boss) rounds are a fixed number of problems with no clock. */
export const TYPE_ROUND_PROBLEMS = 5;
/** Asteroids per wave in tap mode (1 right + 3 plausible wrong). */
export const ASTEROIDS_PER_WAVE = 4;
export const SHIELDS_PER_ROUND = 3;

export function getLevel(id: LevelId): Level {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}

export function levelByStep(step: number): Level | undefined {
  return LEVELS.find((l) => l.step === step);
}

export function isLevelId(value: unknown): value is LevelId {
  return LEVELS.some((l) => l.id === value);
}
