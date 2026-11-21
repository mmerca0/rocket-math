"use client";

import { LEVELS, type Level } from "@/game/levels";
import { bestScore, type Player, type SaveData } from "@/game/storage";
import { LockIcon, Planet } from "./art";
import { Button, MuteButton, Screen } from "./ui";

export function LevelMap({
  data,
  player,
  onPlay,
  onSwitchPlayer,
  onHighScores,
  onToggleMute,
}: {
  data: SaveData;
  player: Player;
  onPlay: (level: Level) => void;
  onSwitchPlayer: () => void;
  onHighScores: () => void;
  onToggleMute: () => void;
}) {
  return (
    <Screen>
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold opacity-70">Pilot</p>
          <h1 className="truncate text-4xl font-black">{player.name}</h1>
        </div>
        <MuteButton
          muted={data.muted}
          onToggle={onToggleMute}
          className="bg-indigo-900/10 dark:bg-white/10"
        />
      </header>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={onHighScores}
          className="flex-1 whitespace-nowrap"
        >
          🏆 High scores
        </Button>
        <Button
          variant="secondary"
          onClick={onSwitchPlayer}
          className="flex-1 whitespace-nowrap"
        >
          Switch pilot
        </Button>
      </div>

      <h2 className="text-2xl font-extrabold">Pick a planet</h2>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LEVELS.map((level) => {
          const locked = level.step > player.unlockedStep;
          const best = bestScore(data, player.id, level.id);
          const current = level.step === player.unlockedStep;
          return (
            <li key={level.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onPlay(level)}
                aria-label={
                  locked
                    ? `Level ${level.id}, locked`
                    : `Play level ${level.id}: ${level.skill}`
                }
                className={`flex h-full w-full flex-col items-center gap-1 rounded-3xl bg-white p-3 text-center shadow-md ring-1 ring-indigo-100 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white/10 dark:ring-white/15 ${
                  current ? "ring-4 ring-orange-400 dark:ring-orange-400" : ""
                }`}
              >
                <span className="flex items-center gap-1 text-sm font-black tracking-widest uppercase opacity-70">
                  Level {level.id} {locked && <LockIcon />}
                </span>
                <Planet color={level.color} locked={locked} />
                <span className="text-lg leading-tight font-extrabold">
                  {level.planet}
                </span>
                <span className="text-base leading-tight font-semibold opacity-75">
                  {level.skill}
                </span>
                {best !== null && (
                  <span className="mt-1 text-sm font-bold text-orange-600 dark:text-orange-300">
                    Best {best}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}
