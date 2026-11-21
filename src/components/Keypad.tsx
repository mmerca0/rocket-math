"use client";

import { useEffect } from "react";

/** Big on-screen number pad, so the iPad keyboard never covers the game. */
export function Keypad({
  value,
  onKey,
  onFire,
  disabled,
}: {
  value: string;
  onKey: (key: string) => void;
  onFire: () => void;
  disabled: boolean;
}) {
  // Also accept a hardware keyboard (iPad keyboard case, computer).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (disabled) return;
      if (/^\d$/.test(e.key)) onKey(e.key);
      else if (e.key === "Backspace") onKey("back");
      else if (e.key === "Enter") onFire();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onKey, onFire]);

  const key =
    "grid place-items-center rounded-2xl bg-white/10 text-[clamp(1.5rem,min(5vw,4.5vh),2.25rem)] font-bold text-white ring-1 ring-white/15 transition active:scale-95 active:bg-white/25 disabled:opacity-40";

  return (
    <div className="flex w-full flex-col gap-2">
      <output
        aria-label="Your answer"
        aria-live="polite"
        className="flex h-[clamp(3.25rem,8vh,4.5rem)] items-center justify-end rounded-2xl bg-black/40 px-4 font-mono text-[clamp(2rem,min(8vw,6vh),3rem)] font-bold tracking-wider text-amber-300 ring-2 ring-amber-300/40"
      >
        {value || <span className="text-white/30">?</span>}
      </output>
      <div className="grid grid-cols-3 gap-2 [&>button]:h-[clamp(2.75rem,7.5vh,4.5rem)]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            className={key}
            disabled={disabled}
            onClick={() => onKey(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className={key}
          disabled={disabled}
          onClick={() => onKey("back")}
          aria-label="Delete"
        >
          ⌫
        </button>
        <button
          type="button"
          className={key}
          disabled={disabled}
          onClick={() => onKey("0")}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled || value === ""}
          onClick={onFire}
          className="grid place-items-center rounded-2xl bg-orange-500 text-[clamp(1.25rem,min(4.5vw,4vh),1.875rem)] font-black text-white shadow-lg shadow-orange-500/40 transition active:scale-95 disabled:opacity-40"
        >
          FIRE
        </button>
      </div>
    </div>
  );
}
