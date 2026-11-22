"use client";

import { useState, type FormEvent } from "react";
import { MAX_FAMILY_CODE_LENGTH } from "@/game/storage";
import { Button } from "./ui";

/** Small form to type (or change) the family leaderboard code. */
export function FamilyCodeForm({
  initial = "",
  onSave,
  onCancel,
  cancelLabel = "Cancel",
}: {
  initial?: string;
  onSave: (code: string) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const [code, setCode] = useState(initial);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(code);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="family-code" className="text-lg font-bold">
        Family code
      </label>
      <input
        id="family-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={MAX_FAMILY_CODE_LENGTH}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className="min-h-14 rounded-2xl border-2 border-indigo-200 bg-white px-4 text-2xl font-bold text-indigo-950 outline-none focus:border-orange-500 dark:border-white/20 dark:bg-indigo-950 dark:text-white"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save code</Button>
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}

/** First-run card on the pilot screen. Never blocks play. */
export function FamilyCodePrompt({
  onSave,
  onDismiss,
}: {
  onSave: (code: string) => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-labelledby="family-prompt-title"
      className="flex flex-col gap-2 rounded-3xl bg-white/70 p-4 shadow-md dark:bg-white/5"
    >
      <h2 id="family-prompt-title" className="text-xl font-extrabold">
        🏆 Share scores with your family?
      </h2>
      <p className="text-base opacity-80">
        Enter your family code to see everyone&apos;s high scores on every
        device. You can skip this and add it later from High scores.
      </p>
      <FamilyCodeForm
        onSave={onSave}
        onCancel={onDismiss}
        cancelLabel="Not now"
      />
    </section>
  );
}
