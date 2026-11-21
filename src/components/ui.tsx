import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SpeakerIcon } from "./art";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-400",
  secondary:
    "bg-white text-indigo-950 shadow ring-1 ring-indigo-200 hover:bg-indigo-50 dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:bg-white/15",
  ghost:
    "text-indigo-900 hover:bg-indigo-900/10 dark:text-white dark:hover:bg-white/10",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-xl font-bold transition active:scale-95 disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function MuteButton({
  muted,
  onToggle,
  className = "",
}: {
  muted: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={muted}
      className={`grid size-12 place-items-center rounded-full transition active:scale-90 ${className}`}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}

/** Page wrapper for the menu screens: centred column, light/dark aware. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="menu-sky flex w-full flex-1 flex-col items-center px-4 pt-4 pb-8 text-indigo-950 dark:text-white">
      <div className="flex w-full max-w-3xl flex-1 flex-col gap-6">
        {children}
      </div>
    </main>
  );
}
