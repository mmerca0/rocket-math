"use client";

import { useEffect } from "react";
import { levelByStep, type Level } from "@/game/levels";
import { summaryMessage } from "@/game/messages";
import {
  accuracy,
  minAnswersFor,
  problemsFinished,
  type RoundStats,
} from "@/game/scoring";
import { playSound } from "@/lib/sound";
import { Rocket } from "./art";
import { Button, Screen } from "./ui";

export interface RoundResult {
  level: Level;
  stats: RoundStats;
  shieldsLeft: number;
  rank: number | null;
  unlockedStep: number | null;
  /** Highest step the player can play now. */
  playerUnlockedStep: number;
}

export function RoundSummary({
  result,
  onReplay,
  onNext,
  onMap,
  onHighScores,
}: {
  result: RoundResult;
  onReplay: () => void;
  onNext: (level: Level) => void;
  onMap: () => void;
  onHighScores: () => void;
}) {
  const { level, stats, shieldsLeft, rank, unlockedStep } = result;
  const acc = accuracy(stats);
  const unlocked = unlockedStep ? levelByStep(unlockedStep) : undefined;
  const next = levelByStep(level.step + 1);
  const canPlayNext = next && next.step <= result.playerUnlockedStep;

  useEffect(() => {
    if (unlocked || rank === 1) playSound("levelUp");
  }, [unlocked, rank]);

  // A short tip when he didn't move up, so he knows why.
  let tip: string | null = null;
  if (!unlocked && level.step === result.playerUnlockedStep && next) {
    if (shieldsLeft === 0)
      tip = "Keep at least one shield to unlock the next planet.";
    else if (problemsFinished(stats) < minAnswersFor(level))
      tip = `Answer ${minAnswersFor(level)} problems in a round to unlock the next planet.`;
    else tip = "Get 8 out of 10 right to unlock the next planet.";
  }

  return (
    <Screen>
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Rocket className="bob h-24 w-16" />
        <h1 className="text-4xl font-black sm:text-5xl">
          {summaryMessage(acc, shieldsLeft)}
        </h1>
        <p className="text-lg font-semibold opacity-70">
          Level {level.id} · {level.planet}
        </p>
      </div>

      {unlocked && (
        <div
          role="status"
          className="rounded-3xl bg-emerald-400 p-4 text-center text-emerald-950 shadow-lg"
        >
          <p className="text-2xl font-black">🚀 New planet unlocked!</p>
          <p className="text-lg font-bold">
            Level {unlocked.id}: {unlocked.planet} — {unlocked.skill}
          </p>
        </div>
      )}
      {rank !== null && (
        <p
          role="status"
          className="rounded-3xl bg-amber-300 p-3 text-center text-xl font-black text-amber-950 shadow"
        >
          🏆 High score! You&apos;re #{rank} on this level.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Score", stats.score],
          ["Correct", `${stats.correct}`],
          ["Accuracy", `${Math.round(acc * 100)}%`],
          ["Best streak", stats.bestStreak],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl bg-white p-4 text-center shadow-md dark:bg-white/10"
          >
            <dt className="text-sm font-bold tracking-wide uppercase opacity-60">
              {label}
            </dt>
            <dd className="text-3xl font-black tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {tip && (
        <p className="text-center text-lg font-semibold opacity-80">{tip}</p>
      )}

      <div className="mt-auto grid gap-3 sm:grid-cols-2">
        {canPlayNext && next && (
          <Button onClick={() => onNext(next)} className="sm:col-span-2">
            Next planet →
          </Button>
        )}
        <Button
          variant={canPlayNext ? "secondary" : "primary"}
          onClick={onReplay}
        >
          Play again
        </Button>
        <Button variant="secondary" onClick={onMap}>
          Planet map
        </Button>
        <Button
          variant="ghost"
          onClick={onHighScores}
          className="sm:col-span-2"
        >
          🏆 High scores
        </Button>
      </div>
    </Screen>
  );
}
