"use client";

import { useState } from "react";
import { LEVELS, type LevelId } from "@/game/levels";
import { scoresFor, type SaveData } from "@/game/storage";
import { Button, Screen } from "./ui";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function HighScores({
  data,
  initialLevel,
  onBack,
}: {
  data: SaveData;
  initialLevel: LevelId;
  onBack: () => void;
}) {
  const [levelId, setLevelId] = useState<LevelId>(initialLevel);
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]!;
  const scores = scoresFor(data, levelId);

  return (
    <Screen>
      <header className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          aria-label="Back"
          className="!px-4"
        >
          ←
        </Button>
        <h1 className="text-4xl font-black">🏆 High scores</h1>
      </header>

      <div
        role="tablist"
        aria-label="Level"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2"
      >
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === levelId}
            onClick={() => setLevelId(l.id)}
            className={`min-h-12 min-w-14 shrink-0 rounded-full px-4 text-lg font-extrabold transition active:scale-95 ${
              l.id === levelId
                ? "bg-orange-500 text-white"
                : "bg-white shadow ring-1 ring-indigo-100 dark:bg-white/10 dark:ring-white/15"
            }`}
          >
            {l.id}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-white p-4 shadow-md dark:bg-white/10">
        <h2 className="mb-3 text-xl font-extrabold">
          Level {level.id}: {level.planet}{" "}
          <span className="font-semibold opacity-70">· {level.skill}</span>
        </h2>
        {scores.length === 0 ? (
          <p className="py-6 text-center text-lg font-semibold opacity-70">
            No scores yet — be the first!
          </p>
        ) : (
          <table className="w-full text-left text-lg">
            <thead>
              <tr className="text-sm tracking-wide uppercase opacity-60">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Pilot</th>
                <th className="py-1 pr-2 text-right">Score</th>
                <th className="py-1 pr-2">Level</th>
                <th className="py-1 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr
                  key={`${s.playerId}-${s.date}-${i}`}
                  className="border-t border-indigo-100 dark:border-white/10"
                >
                  <td className="py-2 pr-2 font-black">{i + 1}</td>
                  <td className="max-w-[8rem] truncate py-2 pr-2 font-bold">
                    {s.name}
                  </td>
                  <td className="py-2 pr-2 text-right font-black tabular-nums">
                    {s.score}
                  </td>
                  <td className="py-2 pr-2">{s.level}</td>
                  <td className="py-2 text-right text-base opacity-75">
                    {dateFormat.format(new Date(s.date))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Screen>
  );
}
