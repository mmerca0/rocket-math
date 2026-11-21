"use client";

/**
 * The whole game in one client component: decides which screen to show and
 * saves results on the device. All game rules live in src/game/.
 */
import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { LEVELS, type Level, type LevelId } from "@/game/levels";
import type { RoundState } from "@/game/round";
import { earnedNextLevel } from "@/game/scoring";
import {
  addPlayer,
  recordRound,
  removePlayer,
  selectPlayer,
  setMuted,
  type RoundOutcome,
} from "@/game/storage";
import { setSoundMuted, unlockSound } from "@/lib/sound";
import { useSaveData } from "@/lib/useSaveData";
import { GameScreen } from "./GameScreen";
import { HighScores } from "./HighScores";
import { LevelMap } from "./LevelMap";
import { PlayerPicker } from "./PlayerPicker";
import { RoundSummary, type RoundResult } from "./RoundSummary";

type View =
  | { name: "home" | "players" }
  | { name: "game"; level: Level; round: number }
  | { name: "summary"; result: RoundResult }
  | { name: "scores"; level: LevelId; back: "home" | "players" | "summary" };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MathRocketApp() {
  const [data, update] = useSaveData();
  const [view, setView] = useState<View>({ name: "home" });
  const [lastSummary, setLastSummary] = useState<RoundResult | null>(null);

  useEffect(() => {
    if (data) setSoundMuted(data.muted);
  }, [data]);

  if (!data) {
    // Server render / first paint, before the device save is read.
    return (
      <main className="menu-sky flex flex-1 items-center justify-center">
        <h1 className="text-4xl font-black text-indigo-950 dark:text-white">
          {site.name}
        </h1>
      </main>
    );
  }

  const player = data.players.find((p) => p.id === data.activePlayerId) ?? null;
  const toggleMute = () => update((d) => setMuted(d, !d.muted));

  function play(level: Level) {
    unlockSound(); // must happen inside a tap for iPad/iPhone
    setView((v) => ({
      name: "game",
      level,
      round: (v.name === "game" ? v.round : 0) + 1,
    }));
  }

  function finish(level: Level, state: RoundState) {
    if (!player) return;
    const earned = earnedNextLevel(state.stats, level, state.shields);
    let outcome: RoundOutcome | null = null;
    update((d) => {
      outcome = recordRound(d, {
        playerId: player.id,
        level: level.id,
        step: level.step,
        score: state.stats.score,
        earnedNextLevel: earned,
        date: new Date(),
      });
      return outcome.data;
    });
    const o = outcome as RoundOutcome | null;
    const result: RoundResult = {
      level,
      stats: state.stats,
      shieldsLeft: state.shields,
      rank: o?.rank ?? null,
      unlockedStep: o?.unlockedStep ?? null,
      playerUnlockedStep:
        o?.data.players.find((p) => p.id === player.id)?.unlockedStep ??
        player.unlockedStep,
    };
    setLastSummary(result);
    setView({ name: "summary", result });
  }

  if (view.name === "scores") {
    return (
      <HighScores
        data={data}
        initialLevel={view.level}
        onBack={() =>
          setView(
            view.back === "summary" && lastSummary
              ? { name: "summary", result: lastSummary }
              : { name: view.back === "players" ? "players" : "home" },
          )
        }
      />
    );
  }

  if (!player || view.name === "players") {
    return (
      <PlayerPicker
        data={data}
        onPick={(id) => {
          update((d) => selectPlayer(d, id));
          setView({ name: "home" });
        }}
        onAdd={(name) => {
          update((d) => addPlayer(d, name, newId(), new Date()));
          setView({ name: "home" });
        }}
        onRemove={(id) => update((d) => removePlayer(d, id))}
        onHighScores={() =>
          setView({ name: "scores", level: "1", back: "players" })
        }
      />
    );
  }

  if (view.name === "game") {
    return (
      <GameScreen
        key={view.round}
        level={view.level}
        muted={data.muted}
        onToggleMute={toggleMute}
        onFinish={(state) => finish(view.level, state)}
        onQuit={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "summary") {
    const { level } = view.result;
    return (
      <RoundSummary
        result={view.result}
        onReplay={() => play(level)}
        onNext={play}
        onMap={() => setView({ name: "home" })}
        onHighScores={() =>
          setView({ name: "scores", level: level.id, back: "summary" })
        }
      />
    );
  }

  const current =
    LEVELS.find((l) => l.step === player.unlockedStep) ?? LEVELS[0]!;
  return (
    <LevelMap
      data={data}
      player={player}
      onPlay={play}
      onSwitchPlayer={() => setView({ name: "players" })}
      onHighScores={() =>
        setView({ name: "scores", level: current.id, back: "home" })
      }
      onToggleMute={toggleMute}
    />
  );
}
