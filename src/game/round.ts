/**
 * One round of play as a "reducer": (state, action) → new state.
 * No timers, sounds or randomness in here — the screen does those and tells
 * the reducer what happened. That keeps the rules easy to test.
 */
import {
  ASTEROIDS_PER_WAVE,
  SHIELDS_PER_ROUND,
  TAP_ROUND_SECONDS,
  TYPE_ROUND_PROBLEMS,
  type Level,
} from "./levels";
import { OOPS, PRAISE, cycle, missedMessage } from "./messages";
import { generateDistractors, generateProblem, type Problem } from "./problems";
import { shuffle, type Rng } from "./rng";
import {
  EMPTY_STATS,
  addCorrect,
  addMissed,
  addWrong,
  type RoundStats,
} from "./scoring";

export type AsteroidState = "flying" | "hit" | "broken" | "fading";

export interface Asteroid {
  id: string;
  value: number;
  isAnswer: boolean;
  /** Column 0–3 (tap mode). */
  lane: number;
  /** Seconds before it starts falling, so they don't arrive together. */
  delay: number;
  state: AsteroidState;
}

export interface Wave {
  id: number;
  problem: Problem;
  asteroids: Asteroid[];
}

export type EndReason = "time" | "shields" | "done";

export interface Message {
  id: number;
  kind: "good" | "oops" | "miss";
  text: string;
}

export interface RoundState {
  level: Level;
  wave: Wave;
  stats: RoundStats;
  shields: number;
  /** Tap mode only; null in type mode (no clock). */
  timeLeftMs: number | null;
  /** Typed digits (type mode). */
  input: string;
  /** "resolving" = short pause after a wave ends, before the next one. */
  status: "playing" | "resolving" | "over";
  paused: boolean;
  endReason: EndReason | null;
  message: Message | null;
  messageCount: number;
}

export function createWave(level: Level, waveId: number, rng: Rng): Wave {
  const problem = generateProblem(level.id, rng);
  if (level.mode === "type") {
    return {
      id: waveId,
      problem,
      asteroids: [
        {
          id: `${waveId}-boss`,
          value: problem.answer,
          isAnswer: true,
          lane: 0,
          delay: 0,
          state: "flying",
        },
      ],
    };
  }
  const wrong = generateDistractors(
    problem,
    level.id,
    ASTEROIDS_PER_WAVE - 1,
    rng,
  );
  const values = shuffle(rng, [problem.answer, ...wrong]);
  const lanes = shuffle(rng, [0, 1, 2, 3]);
  // Stagger starts across ~30% of the fall time.
  const delays = shuffle(rng, [0, 0.1, 0.2, 0.3]).map(
    (f) => +(f * level.fallSeconds).toFixed(2),
  );
  return {
    id: waveId,
    problem,
    asteroids: values.map((value, i) => ({
      id: `${waveId}-${i}`,
      value,
      isAnswer: value === problem.answer,
      lane: lanes[i] ?? i,
      delay: delays[i] ?? 0,
      state: "flying",
    })),
  };
}

export function createRound(level: Level, rng: Rng): RoundState {
  return {
    level,
    wave: createWave(level, 1, rng),
    stats: EMPTY_STATS,
    shields: SHIELDS_PER_ROUND,
    timeLeftMs: level.mode === "tap" ? TAP_ROUND_SECONDS * 1000 : null,
    input: "",
    status: "playing",
    paused: false,
    endReason: null,
    message: null,
    messageCount: 0,
  };
}

export type RoundAction =
  /** Tapped an asteroid (tap mode). fallLeft: 1 = top, 0 = bottom. */
  | { type: "tap"; asteroidId: string; fallLeft: number }
  /** Pressed Fire with the typed answer (type mode). */
  | { type: "fire"; fallLeft: number }
  | { type: "key"; key: string }
  | { type: "landed"; asteroidId: string }
  | { type: "nextWave"; wave: Wave }
  | { type: "tick"; ms: number }
  | { type: "pause" }
  | { type: "resume" };

const MAX_INPUT_DIGITS = 6;

function say(
  state: RoundState,
  kind: Message["kind"],
  text: string,
): Pick<RoundState, "message" | "messageCount"> {
  const id = state.messageCount + 1;
  return { message: { id, kind, text }, messageCount: id };
}

function setAsteroids(wave: Wave, fn: (a: Asteroid) => AsteroidState): Wave {
  return {
    ...wave,
    asteroids: wave.asteroids.map((a) => ({ ...a, state: fn(a) })),
  };
}

/** After the right answer is found (or lands): finish the wave or the round. */
function endWave(state: RoundState): RoundState {
  if (state.shields <= 0)
    return { ...state, status: "over", endReason: "shields" };
  const finished = state.stats.correct + state.stats.missed;
  if (state.level.mode === "type" && finished >= TYPE_ROUND_PROBLEMS) {
    return { ...state, status: "over", endReason: "done" };
  }
  return { ...state, status: "resolving" };
}

export function roundReducer(
  state: RoundState,
  action: RoundAction,
): RoundState {
  if (state.status === "over") return state;

  switch (action.type) {
    case "pause":
      return { ...state, paused: true };
    case "resume":
      return { ...state, paused: false };
    case "tick": {
      if (state.paused || state.timeLeftMs === null) return state;
      const timeLeftMs = Math.max(0, state.timeLeftMs - action.ms);
      if (timeLeftMs === 0)
        return { ...state, timeLeftMs, status: "over", endReason: "time" };
      return { ...state, timeLeftMs };
    }
    case "nextWave":
      return { ...state, wave: action.wave, status: "playing", input: "" };
  }

  // Everything below is a player/asteroid event: ignore while paused or between waves.
  if (state.paused || state.status !== "playing") return state;

  switch (action.type) {
    case "tap": {
      const target = state.wave.asteroids.find(
        (a) => a.id === action.asteroidId,
      );
      if (!target || target.state !== "flying") return state;
      if (target.isAnswer) {
        const stats = addCorrect(state.stats, state.level, action.fallLeft);
        return endWave({
          ...state,
          stats,
          wave: setAsteroids(state.wave, (a) =>
            a.id === target.id
              ? "hit"
              : a.state === "flying"
                ? "fading"
                : a.state,
          ),
          ...say(state, "good", cycle(PRAISE, stats.correct - 1)),
        });
      }
      const stats = addWrong(state.stats);
      const next: RoundState = {
        ...state,
        stats,
        shields: state.shields - 1,
        wave: setAsteroids(state.wave, (a) =>
          a.id === target.id ? "broken" : a.state,
        ),
        ...say(state, "oops", cycle(OOPS, stats.wrong - 1)),
      };
      return next.shields <= 0
        ? { ...next, status: "over", endReason: "shields" }
        : next;
    }
    case "key": {
      if (action.key === "back")
        return { ...state, input: state.input.slice(0, -1) };
      if (/^\d$/.test(action.key) && state.input.length < MAX_INPUT_DIGITS) {
        const input =
          state.input === "0" ? action.key : state.input + action.key;
        return { ...state, input };
      }
      return state;
    }
    case "fire": {
      if (state.input === "") return state;
      const boss = state.wave.asteroids[0];
      if (!boss || boss.state !== "flying") return state;
      if (Number(state.input) === state.wave.problem.answer) {
        const stats = addCorrect(state.stats, state.level, action.fallLeft);
        return endWave({
          ...state,
          stats,
          wave: setAsteroids(state.wave, () => "hit"),
          ...say(state, "good", cycle(PRAISE, stats.correct - 1)),
        });
      }
      const stats = addWrong(state.stats);
      const next: RoundState = {
        ...state,
        stats,
        input: "",
        shields: state.shields - 1,
        ...say(state, "oops", cycle(OOPS, stats.wrong - 1)),
      };
      return next.shields <= 0
        ? { ...next, status: "over", endReason: "shields" }
        : next;
    }
    case "landed": {
      const target = state.wave.asteroids.find(
        (a) => a.id === action.asteroidId,
      );
      if (!target || target.state !== "flying") return state;
      if (!target.isAnswer) {
        // Wrong answers just burn up — no penalty.
        return {
          ...state,
          wave: setAsteroids(state.wave, (a) =>
            a.id === target.id ? "fading" : a.state,
          ),
        };
      }
      return endWave({
        ...state,
        stats: addMissed(state.stats),
        shields: state.shields - 1,
        wave: setAsteroids(state.wave, (a) =>
          a.state === "flying" ? "fading" : a.state,
        ),
        ...say(state, "miss", missedMessage(state.wave.problem.answer)),
      });
    }
  }
}
