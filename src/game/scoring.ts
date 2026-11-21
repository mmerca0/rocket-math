/**
 * Points, accuracy and the "move up a level?" rule. Plain functions.
 */
import type { Level } from "./levels";
import { TYPE_ROUND_PROBLEMS } from "./levels";

export interface RoundStats {
  score: number;
  correct: number;
  /** Wrong taps / wrong typed answers. */
  wrong: number;
  /** Right-answer asteroids that reached the bottom. */
  missed: number;
  streak: number;
  bestStreak: number;
}

export const EMPTY_STATS: RoundStats = {
  score: 0,
  correct: 0,
  wrong: 0,
  missed: 0,
  streak: 0,
  bestStreak: 0,
};

export const PASS_ACCURACY = 0.8;
/** Tap rounds need at least this many problems answered before you can move up. */
export const TAP_MIN_ANSWERS = 8;
export const STREAK_EVERY = 5;

/** Points for one correct answer. Mistakes never remove points. */
export function pointsForCorrect(
  level: Level,
  /** How much of the fall was left when answered: 1 = instantly, 0 = at the bottom. */
  fallLeft: number,
  /** Streak count INCLUDING this answer. */
  streak: number,
): number {
  const base = 10 * level.step;
  const clamped = Math.min(1, Math.max(0, fallLeft));
  const speedBonus = Math.round(base * 0.5 * clamped);
  const streakBonus = streak > 0 && streak % STREAK_EVERY === 0 ? base * 2 : 0;
  return base + speedBonus + streakBonus;
}

export function addCorrect(
  stats: RoundStats,
  level: Level,
  fallLeft: number,
): RoundStats {
  const streak = stats.streak + 1;
  return {
    ...stats,
    correct: stats.correct + 1,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    score: stats.score + pointsForCorrect(level, fallLeft, streak),
  };
}

export function addWrong(stats: RoundStats): RoundStats {
  return { ...stats, wrong: stats.wrong + 1, streak: 0 };
}

export function addMissed(stats: RoundStats): RoundStats {
  return { ...stats, missed: stats.missed + 1, streak: 0 };
}

/** correct ÷ (correct + wrong + missed). 0 when nothing was attempted. */
export function accuracy(stats: RoundStats): number {
  const attempts = stats.correct + stats.wrong + stats.missed;
  return attempts === 0 ? 0 : stats.correct / attempts;
}

/** Problems finished (answered right, or the right asteroid landed). */
export function problemsFinished(stats: RoundStats): number {
  return stats.correct + stats.missed;
}

export function minAnswersFor(level: Level): number {
  return level.mode === "tap" ? TAP_MIN_ANSWERS : TYPE_ROUND_PROBLEMS;
}

/**
 * Move up when: the round was played to the end (not out of shields),
 * enough problems were done, and accuracy is at least 80%.
 */
export function earnedNextLevel(
  stats: RoundStats,
  level: Level,
  shieldsLeft: number,
): boolean {
  return (
    shieldsLeft > 0 &&
    problemsFinished(stats) >= minAnswersFor(level) &&
    accuracy(stats) >= PASS_ACCURACY
  );
}
