/**
 * Original artwork drawn with inline SVG — no image files, no borrowed art.
 */

export function Rocket({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 96" className={className} aria-hidden="true">
      <path d="M24 74 Q32 96 40 74 Z" fill="#fb923c" className="flame" />
      <path d="M27 74 Q32 88 37 74 Z" fill="#fde047" className="flame" />
      <path d="M14 56 L6 76 L22 70 Z" fill="#ef4444" />
      <path d="M50 56 L58 76 L42 70 Z" fill="#ef4444" />
      <path
        d="M32 4 C48 18 50 44 46 72 L18 72 C14 44 16 18 32 4 Z"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d="M32 4 C40 11 44 20 45.5 28 L18.5 28 C20 20 24 11 32 4 Z"
        fill="#ef4444"
      />
      <circle
        cx="32"
        cy="44"
        r="8"
        fill="#38bdf8"
        stroke="#0369a1"
        strokeWidth="3"
      />
      <circle cx="29.5" cy="41.5" r="2.5" fill="#e0f2fe" />
      <rect x="28" y="66" width="8" height="10" rx="2" fill="#64748b" />
    </svg>
  );
}

/** Asteroid colours: bright, friendly rocks. */
export const ROCK_COLORS = [
  { fill: "#a78bfa", dark: "#7c3aed" },
  { fill: "#5eead4", dark: "#0d9488" },
  { fill: "#fda4af", dark: "#e11d48" },
  { fill: "#fcd34d", dark: "#d97706" },
] as const;

export function AsteroidShape({
  color,
}: {
  color: { fill: string; dark: string };
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <path
        d="M50 4 L70 9 L86 22 L95 42 L92 64 L81 82 L60 95 L38 94 L19 84 L7 66 L5 44 L13 24 L30 10 Z"
        fill={color.fill}
        stroke={color.dark}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="30" r="8" fill={color.dark} opacity="0.35" />
      <circle cx="74" cy="68" r="10" fill={color.dark} opacity="0.3" />
      <circle cx="70" cy="26" r="5" fill={color.dark} opacity="0.3" />
      <circle cx="26" cy="72" r="5" fill={color.dark} opacity="0.3" />
    </svg>
  );
}

export function Shield({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 28" className="size-7 sm:size-8" aria-hidden="true">
      <path
        d="M12 2 L22 6 V13 C22 20 17 24.5 12 26 C7 24.5 2 20 2 13 V6 Z"
        fill={on ? "#22d3ee" : "transparent"}
        stroke={on ? "#a5f3fc" : "#475569"}
        strokeWidth="2"
      />
    </svg>
  );
}

export function Planet({ color, locked }: { color: string; locked: boolean }) {
  return (
    <svg
      viewBox="0 0 100 70"
      className="h-16 w-24 sm:h-20 sm:w-28"
      aria-hidden="true"
    >
      <ellipse
        cx="50"
        cy="38"
        rx="46"
        ry="10"
        fill="none"
        stroke={locked ? "#94a3b8" : "#fef3c7"}
        strokeWidth="4"
        opacity="0.8"
      />
      <circle cx="50" cy="35" r="26" fill={locked ? "#94a3b8" : color} />
      <circle cx="41" cy="27" r="6" fill="#fff" opacity="0.35" />
      <path
        d="M8 38 A46 10 0 0 0 92 38"
        fill="none"
        stroke={locked ? "#94a3b8" : "#fef3c7"}
        strokeWidth="4"
      />
    </svg>
  );
}

export function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" />
      {muted ? (
        <path d="M17 9 L22 14 M22 9 L17 14" />
      ) : (
        <path d="M16.5 8.5 Q19 12 16.5 15.5 M19 6 Q23 12 19 18" />
      )}
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 10 V7 a5 5 0 0 1 10 0 V10 H19 V21 H5 V10 Z M9 10 H15 V7 a3 3 0 0 0 -6 0 Z" />
    </svg>
  );
}
