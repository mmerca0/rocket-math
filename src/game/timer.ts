/**
 * The round-timer progress bar: how full it is, what colour, and when it
 * pulses. Pure maths, no React, so it's easy to test.
 *
 * Tweak the seconds below to change when the bar turns yellow / red / pulses.
 */

/** Bar turns yellow when this many seconds (or fewer) are left. */
export const TIMER_YELLOW_SECONDS = 30;
/** Bar turns red when this many seconds (or fewer) are left. */
export const TIMER_RED_SECONDS = 15;
/** Bar pulses gently in the final seconds. */
export const TIMER_PULSE_SECONDS = 10;

export type TimerColor = "green" | "yellow" | "red";

/** The actual colours, picked to stand out on the dark game sky. */
export const TIMER_COLORS: Record<TimerColor, string> = {
  green: "#4ade80",
  yellow: "#facc15",
  red: "#fb7c7c",
};

export interface TimerBar {
  /** How full the bar is, 0–100. */
  percent: number;
  color: TimerColor;
  pulse: boolean;
}

export function timerBar(timeLeftMs: number, totalMs: number): TimerBar {
  const left = Math.max(0, Math.min(timeLeftMs, totalMs));
  const percent = totalMs > 0 ? (left / totalMs) * 100 : 0;
  const color: TimerColor =
    left <= TIMER_RED_SECONDS * 1000
      ? "red"
      : left <= TIMER_YELLOW_SECONDS * 1000
        ? "yellow"
        : "green";
  return {
    percent,
    color,
    // Stop pulsing once time is up.
    pulse: left > 0 && left <= TIMER_PULSE_SECONDS * 1000,
  };
}
