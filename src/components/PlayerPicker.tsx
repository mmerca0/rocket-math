"use client";

import { useState, type FormEvent } from "react";
import { levelByStep } from "@/game/levels";
import { MAX_NAME_LENGTH, nameProblem, type SaveData } from "@/game/storage";
import { site } from "@/config/site";
import { Rocket } from "./art";
import { FamilyCodePrompt } from "./FamilyCode";
import { Button, Screen } from "./ui";

export function PlayerPicker({
  data,
  onPick,
  onAdd,
  onRemove,
  onHighScores,
  onSetFamilyCode,
  onDismissFamilyPrompt,
}: {
  data: SaveData;
  onPick: (id: string) => void;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onHighScores: () => void;
  onSetFamilyCode: (code: string) => void;
  onDismissFamilyPrompt: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const showForm = adding || data.players.length === 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = nameProblem(data, name);
    if (problem) {
      setError(problem);
      return;
    }
    onAdd(name);
    setName("");
    setError(null);
    setAdding(false);
  }

  return (
    <Screen>
      <header className="flex flex-col items-center gap-2 pt-4 text-center">
        <Rocket className="bob h-28 w-20" />
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
          {site.name}
        </h1>
        <p className="text-xl font-semibold opacity-75">
          Who&apos;s flying today?
        </p>
      </header>

      {!data.familyCode && !data.familyPromptDismissed && (
        <FamilyCodePrompt
          onSave={onSetFamilyCode}
          onDismiss={onDismissFamilyPrompt}
        />
      )}

      {data.players.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.players.map((p) => {
            const level = levelByStep(p.unlockedStep);
            return (
              <li key={p.id} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  disabled={editing}
                  className="flex min-h-20 flex-1 items-center gap-4 rounded-3xl bg-white px-5 text-left shadow-md ring-1 ring-indigo-100 transition active:scale-[0.98] disabled:opacity-60 dark:bg-white/10 dark:ring-white/15"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-orange-500 text-2xl font-black text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-2xl font-extrabold">
                      {p.name}
                    </span>
                    <span className="block text-base font-semibold opacity-70">
                      Level {level?.id ?? 1}
                    </span>
                  </span>
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          data.familyCode
                            ? `Remove pilot ${p.name} from this device? Their scores stay on the family leaderboard.`
                            : `Remove pilot ${p.name} and their high scores?`,
                        )
                      )
                        onRemove(p.id);
                    }}
                    aria-label={`Remove ${p.name}`}
                    className="grid w-16 place-items-center rounded-3xl bg-rose-500 text-3xl font-black text-white active:scale-95"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-3xl bg-white/70 p-4 shadow-md dark:bg-white/5"
        >
          <label htmlFor="pilot-name" className="text-xl font-bold">
            New pilot name
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="pilot-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              placeholder="Name"
              className="min-h-14 flex-1 rounded-2xl border-2 border-indigo-200 bg-white px-4 text-2xl font-bold text-indigo-950 outline-none focus:border-orange-500 dark:border-white/20 dark:bg-indigo-950 dark:text-white"
            />
            <Button type="submit">Add pilot</Button>
          </div>
          {error && (
            <p
              role="alert"
              className="text-lg font-semibold text-rose-600 dark:text-rose-300"
            >
              {error}
            </p>
          )}
          {data.players.length > 0 && (
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => setAdding(true)} disabled={editing}>
            + New pilot
          </Button>
          <Button variant="secondary" onClick={onHighScores} disabled={editing}>
            🏆 High scores
          </Button>
          <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "Edit pilots"}
          </Button>
        </div>
      )}

      <p className="mt-auto text-center text-sm opacity-60">
        {data.familyCode
          ? "Pilots and scores are shared with your family's devices."
          : "Names and scores stay on this device."}
      </p>
    </Screen>
  );
}
