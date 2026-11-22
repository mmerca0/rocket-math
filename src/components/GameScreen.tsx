"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type CSSProperties,
} from "react";
import {
  SHIELDS_PER_ROUND,
  TAP_ROUND_SECONDS,
  type Level,
} from "@/game/levels";
import { GAME_PLANET_OPACITY, getPlanet, skyBackground } from "@/game/planets";
import { problemText, type Problem } from "@/game/problems";
import {
  createRound,
  createWave,
  roundReducer,
  type Asteroid,
  type RoundState,
} from "@/game/round";
import { playSound } from "@/lib/sound";
import {
  AsteroidShape,
  BOSS_ROCK_COLOR,
  ROCK_COLORS,
  Rocket,
  Shield,
} from "./art";
import { Keypad } from "./Keypad";
import { PlanetBackdrop } from "./PlanetArt";
import { TimerBar } from "./TimerBar";
import { Button, MuteButton } from "./ui";

/** How much of the fall is left (1 = just appeared, 0 = landed), read from the CSS animation. */
function fallLeft(wrapper: Element | null): number {
  const anim = wrapper
    ?.getAnimations?.()
    .find((a) => (a as CSSAnimation).animationName === "fall");
  const progress = anim?.effect?.getComputedTiming().progress;
  return typeof progress === "number" ? 1 - progress : 0.5;
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function GameScreen({
  level,
  muted,
  onToggleMute,
  onFinish,
  onQuit,
}: {
  level: Level;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (state: RoundState) => void;
  onQuit: () => void;
}) {
  const [state, dispatch] = useReducer(roundReducer, level, (l) =>
    createRound(l, Math.random),
  );
  const { wave, status, paused, message } = state;
  const bossRef = useRef<HTMLDivElement>(null);

  // Round clock (tap mode only).
  useEffect(() => {
    if (state.timeLeftMs === null || paused || status === "over") return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", ms: now - last });
      last = now;
    }, 250);
    return () => window.clearInterval(id);
  }, [paused, status, state.timeLeftMs === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Short pause after a wave, then the next problem.
  useEffect(() => {
    if (status !== "resolving") return;
    const delay = message?.kind === "miss" ? 1600 : 700;
    const id = window.setTimeout(
      () =>
        dispatch({
          type: "nextWave",
          wave: createWave(level, wave.id + 1, Math.random),
        }),
      delay,
    );
    return () => window.clearTimeout(id);
  }, [status, wave.id, level, message?.kind]);

  // Round over → summary after the last explosion finishes.
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  });
  useEffect(() => {
    if (status !== "over") return;
    const id = window.setTimeout(() => finishRef.current(state), 1100);
    return () => window.clearTimeout(id);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sounds follow the messages.
  useEffect(() => {
    if (!message) return;
    playSound(
      message.kind === "good"
        ? "blast"
        : message.kind === "oops"
          ? "oops"
          : "shieldLost",
    );
  }, [message]);

  // Leaving the app (home button, lock screen) pauses the game.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKey = useCallback((key: string) => {
    playSound("click");
    dispatch({ type: "key", key });
  }, []);
  const onFire = useCallback(() => {
    playSound("fire");
    dispatch({ type: "fire", fallLeft: fallLeft(bossRef.current) });
  }, []);

  const isType = level.mode === "type";
  const planet = getPlanet(level.id);
  const inputDisabled = paused || status !== "playing";

  return (
    <div
      style={{ background: skyBackground(planet) }}
      className={`fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-white select-none ${paused ? "game-paused" : ""}`}
    >
      <PlanetBackdrop
        theme={planet}
        planetOpacity={GAME_PLANET_OPACITY}
        side={isType ? "left" : "right"}
      />

      {/* Top bar ("relative" keeps it in front of the planet backdrop) */}
      <header className="relative flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "pause" })}
          aria-label="Pause"
          className="grid size-12 place-items-center rounded-full bg-white/10 text-2xl font-black active:scale-90"
        >
          ❚❚
        </button>
        <div
          className={`flex gap-1 ${message?.kind !== "good" && message ? "shake" : ""}`}
          key={state.shields}
          aria-label={`${state.shields} shields left`}
          role="img"
        >
          {Array.from({ length: SHIELDS_PER_ROUND }, (_, i) => (
            <Shield key={i} on={i < state.shields} />
          ))}
        </div>
        <div className="ml-auto text-right leading-tight">
          <div className="text-xs font-semibold tracking-widest text-white/70 uppercase">
            Score
          </div>
          <div className="text-2xl font-black tabular-nums" aria-live="polite">
            {state.stats.score}
          </div>
        </div>
        <div className="min-w-16 text-right leading-tight sm:min-w-24">
          <div className="text-xs font-semibold tracking-widest text-white/70 uppercase">
            {isType ? "Rock" : "Time"}
          </div>
          <div className="text-2xl font-black tabular-nums">
            {state.timeLeftMs !== null
              ? formatTime(state.timeLeftMs)
              : `${Math.min(state.stats.correct + state.stats.missed + (status === "playing" ? 1 : 0), 5)}/5`}
          </div>
          {state.timeLeftMs !== null && (
            <TimerBar
              timeLeftMs={state.timeLeftMs}
              totalMs={TAP_ROUND_SECONDS * 1000}
            />
          )}
        </div>
        <MuteButton
          muted={muted}
          onToggle={onToggleMute}
          className="bg-white/10"
        />
      </header>

      <div
        className={`relative flex min-h-0 flex-1 flex-col ${isType ? "landscape:flex-row" : ""}`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Play field */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Planet surface the rocks must not reach (drawn behind them) */}
            <svg
              viewBox="0 0 400 24"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-5 w-full sm:h-7"
              aria-hidden="true"
            >
              <path
                d="M0 10 Q50 2 100 8 T200 8 T300 6 T400 9 V24 H0 Z"
                fill={planet.ground}
              />
              <path
                d="M0 10 Q50 2 100 8 T200 8 T300 6 T400 9"
                fill="none"
                stroke={planet.groundEdge}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {wave.asteroids.map((a) =>
              isType ? (
                <BossAsteroid
                  key={a.id}
                  asteroid={a}
                  level={level}
                  wrapperRef={bossRef}
                  onLanded={() =>
                    dispatch({ type: "landed", asteroidId: a.id })
                  }
                />
              ) : (
                <TapAsteroid
                  key={a.id}
                  asteroid={a}
                  level={level}
                  onTap={(left) =>
                    dispatch({ type: "tap", asteroidId: a.id, fallLeft: left })
                  }
                  onLanded={() =>
                    dispatch({ type: "landed", asteroidId: a.id })
                  }
                />
              ),
            )}
          </div>

          {/* Problem panel */}
          <section
            aria-label="Problem"
            style={{ backgroundColor: planet.panel }}
            className="flex shrink-0 flex-col items-center border-t border-white/10 px-4 pt-1 pb-3"
          >
            {/* Messages live here (fixed height) so they never cover an asteroid. */}
            <div
              role="status"
              className="flex h-8 items-center text-lg font-extrabold sm:text-xl"
            >
              {message && (
                <span
                  key={message.id}
                  className={`pop-msg ${message.kind === "good" ? "text-emerald-300" : "text-amber-300"}`}
                >
                  {message.text}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              {!isType && (
                <Rocket className="bob hidden h-16 w-10 shrink-0 sm:block" />
              )}
              <ProblemDisplay
                problem={wave.problem}
                big={level.bigProblem}
                stacked={isType && wave.problem.op === "×"}
              />
            </div>
          </section>
        </div>

        {/* Number pad: below in portrait, on the right in landscape */}
        {isType && (
          <div
            style={{ backgroundColor: planet.panel }}
            className="flex shrink-0 justify-center px-4 pb-3 landscape:w-[min(44vw,24rem)] landscape:items-center landscape:border-l landscape:border-white/10 landscape:py-3"
          >
            <div className="w-full max-w-sm">
              <Keypad
                value={state.input}
                onKey={onKey}
                onFire={onFire}
                disabled={inputDisabled}
              />
            </div>
          </div>
        )}
      </div>

      {paused && status !== "over" && (
        <div
          className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Paused"
        >
          <div className="flex w-full max-w-xs flex-col gap-4 text-center">
            <h2 className="text-4xl font-black">Paused</h2>
            <Button onClick={() => dispatch({ type: "resume" })}>
              Keep flying
            </Button>
            <Button
              variant="secondary"
              onClick={onQuit}
              className="!bg-white/10 !text-white !ring-white/20"
            >
              Back to map
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProblemDisplay({
  problem,
  big,
  stacked,
}: {
  problem: Problem;
  big: boolean;
  stacked: boolean;
}) {
  const size = big
    ? "text-[clamp(2.75rem,min(11vw,9vh),5.5rem)]"
    : "text-[clamp(2.5rem,min(9vw,8vh),4.5rem)]";
  if (stacked) {
    // Written the way he'd write it on paper.
    return (
      <div
        aria-label={problemText(problem)}
        className={`grid grid-cols-[auto_auto] gap-x-3 font-mono leading-none font-black tabular-nums ${size}`}
      >
        <span />
        <span className="text-right">{problem.a}</span>
        <span className="text-orange-300">×</span>
        <span className="border-b-4 border-white pb-1 text-right">
          {problem.b}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`font-black tracking-tight whitespace-nowrap tabular-nums ${size}`}
      aria-live="polite"
    >
      {problem.a} <span className="text-orange-300">{problem.op}</span>{" "}
      {problem.b} <span className="text-white/50">=</span>{" "}
      <span className="text-amber-300">?</span>
    </div>
  );
}

const ROCK_SIZE = "size-[clamp(4.5rem,min(21vw,20vh),8.5rem)]";

function stateClass(a: Asteroid) {
  return a.state === "hit"
    ? "boom"
    : a.state === "broken"
      ? "crumble"
      : a.state === "fading"
        ? "fade-out"
        : "";
}

function TapAsteroid({
  asteroid: a,
  level,
  onTap,
  onLanded,
}: {
  asteroid: Asteroid;
  level: Level;
  onTap: (fallLeft: number) => void;
  onLanded: () => void;
}) {
  const style: CSSProperties = {
    left: `${12.5 + a.lane * 25}%`,
    animationDuration: `${level.fallSeconds}s`,
    animationDelay: `${a.delay}s`,
    // Freeze in place once hit or broken, so the explosion happens where it was.
    animationPlayState: a.state === "flying" ? undefined : "paused",
  };
  const color = ROCK_COLORS[a.lane % ROCK_COLORS.length] ?? ROCK_COLORS[0];
  return (
    <div
      className="fall pointer-events-none absolute top-0 h-full"
      style={style}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onLanded();
      }}
    >
      <button
        type="button"
        disabled={a.state !== "flying"}
        onClick={(e) => onTap(fallLeft(e.currentTarget.parentElement))}
        aria-label={`Answer ${a.value}`}
        className={`pointer-events-auto absolute bottom-0 left-0 -translate-x-1/2 ${ROCK_SIZE} ${stateClass(a)}`}
      >
        <span className="spin absolute inset-0 block">
          <AsteroidShape color={color} />
        </span>
        <span className="relative text-[clamp(1.5rem,min(6.5vw,6vh),2.75rem)] font-black text-slate-950 tabular-nums drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          {a.value}
        </span>
      </button>
    </div>
  );
}

function BossAsteroid({
  asteroid: a,
  level,
  wrapperRef,
  onLanded,
}: {
  asteroid: Asteroid;
  level: Level;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onLanded: () => void;
}) {
  return (
    <div
      ref={wrapperRef}
      className="fall pointer-events-none absolute top-0 left-1/2 h-full"
      style={{
        animationDuration: `${level.fallSeconds}s`,
        // Start already peeking in, instead of a long wait above the screen.
        animationDelay: `${-0.15 * level.fallSeconds}s`,
        animationPlayState: a.state === "flying" ? undefined : "paused",
      }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onLanded();
      }}
    >
      <div
        className={`absolute bottom-0 left-0 grid size-[clamp(7rem,min(34vw,28vh),13rem)] -translate-x-1/2 place-items-center ${stateClass(a)}`}
        aria-hidden="true"
      >
        <span className="spin absolute inset-0 block">
          <AsteroidShape color={BOSS_ROCK_COLOR} />
        </span>
        <span className="relative text-[clamp(2.5rem,min(10vw,8vh),4.5rem)] font-black text-slate-900">
          ?
        </span>
      </div>
    </div>
  );
}
