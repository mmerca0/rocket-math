import { TIMER_COLORS, timerBar } from "@/game/timer";

/**
 * A bar that empties as the round runs out. Sits under the clock digits.
 * Hidden from screen readers: the clock right above it already says the time.
 */
export function TimerBar({
  timeLeftMs,
  totalMs,
}: {
  timeLeftMs: number;
  totalMs: number;
}) {
  const { percent, color, pulse } = timerBar(timeLeftMs, totalMs);
  return (
    <div
      aria-hidden="true"
      data-testid="timer-bar"
      data-color={color}
      className={`mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/20 sm:h-3 ${pulse ? "timer-pulse" : ""}`}
    >
      {/* scaleX instead of width: the iPad can move it without redrawing. */}
      <div
        className="timer-fill h-full w-full origin-left rounded-full"
        style={{
          transform: `scaleX(${percent / 100})`,
          backgroundColor: TIMER_COLORS[color],
        }}
      />
    </div>
  );
}
