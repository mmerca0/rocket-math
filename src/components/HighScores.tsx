"use client";

import { useEffect, useState } from "react";
import { LEVELS, type LevelId } from "@/game/levels";
import { scoresFor, type SaveData } from "@/game/storage";
import { fetchLeaderboard, type LeaderboardResult } from "@/lib/sync";
import { FamilyCodeForm } from "./FamilyCode";
import { Button, Screen } from "./ui";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface Row {
  key: string;
  name: string;
  score: number;
  accuracy: number | null;
  date: string;
}

export function HighScores({
  data,
  initialLevel,
  onBack,
  onSetFamilyCode,
}: {
  data: SaveData;
  initialLevel: LevelId;
  onBack: () => void;
  onSetFamilyCode: (code: string) => void;
}) {
  const [levelId, setLevelId] = useState<LevelId>(initialLevel);
  const [editingCode, setEditingCode] = useState(false);
  // Shared results, remembered per family code + level so tabs don't flicker.
  const [boards, setBoards] = useState<Record<string, LeaderboardResult>>({});
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]!;
  const code = data.familyCode;
  const boardKey = `${code ?? ""}|${levelId}`;
  const board = code ? boards[boardKey] : undefined;

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetchLeaderboard(levelId).then((result) => {
      if (!cancelled) setBoards((b) => ({ ...b, [boardKey]: result }));
    });
    return () => {
      cancelled = true;
    };
  }, [code, levelId, boardKey]);

  const shared = board?.kind === "ok";
  const rows: Row[] = shared
    ? board.scores.map((s) => ({
        key: s.id,
        name: s.name,
        score: s.score,
        accuracy: s.accuracy,
        date: s.played_at,
      }))
    : scoresFor(data, levelId).map((s, i) => ({
        key: s.id ?? `${s.playerId}-${s.date}-${i}`,
        name: s.name,
        score: s.score,
        accuracy: s.accuracy ?? null,
        date: s.date,
      }));

  let status: string;
  if (!code) status = "Scores on this device only.";
  else if (!board) status = "Loading family scores…";
  else if (board.kind === "ok") status = "Family scores from every device.";
  else if (board.kind === "bad-code")
    status = "Family code not accepted. Showing this device's scores.";
  else
    status =
      "Can't reach family scores right now. Showing this device's scores.";

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

      <div className="flex flex-col gap-3 rounded-3xl bg-white/70 p-4 shadow-md dark:bg-white/5">
        {editingCode ? (
          <FamilyCodeForm
            initial={code ?? ""}
            onSave={(next) => {
              onSetFamilyCode(next);
              setEditingCode(false);
            }}
            onCancel={() => setEditingCode(false)}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-base font-semibold opacity-80">
              {status}
            </p>
            <Button
              variant="secondary"
              onClick={() => setEditingCode(true)}
              className="!min-h-12 !px-4 !text-lg"
            >
              {code ? "Change family code" : "Add family code"}
            </Button>
          </div>
        )}
      </div>

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
        {rows.length === 0 ? (
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
                <th className="py-1 pr-2 text-right">
                  <abbr title="Accuracy" className="no-underline">
                    Acc.
                  </abbr>
                </th>
                <th className="py-1 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr
                  key={s.key}
                  className="border-t border-indigo-100 dark:border-white/10"
                >
                  <td className="py-2 pr-2 font-black">{i + 1}</td>
                  <td className="max-w-[8rem] truncate py-2 pr-2 font-bold">
                    {s.name}
                  </td>
                  <td className="py-2 pr-2 text-right font-black tabular-nums">
                    {s.score}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {s.accuracy === null ? "—" : `${s.accuracy}%`}
                  </td>
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
