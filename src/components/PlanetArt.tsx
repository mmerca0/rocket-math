/**
 * Planets drawn with inline SVG — our own designs, no image files.
 * Colours come from `src/game/planets.ts`.
 *
 * The surface details are drawn twice side by side; sliding them left inside
 * the round "window" makes the planet look like it slowly turns.
 */
import { useId, type ReactNode } from "react";
import type { PlanetKind, PlanetTheme } from "@/game/planets";

const CX = 50;
const CY = 50;
const R = 34;

/** A little 5-armed star shape (for the starfish islands). */
function star(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(
      `${(x + rad * Math.cos(a)).toFixed(1)},${(y + rad * Math.sin(a)).toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

/** Surface details for one 100-unit-wide strip. Drawn at x and x+100. */
function surface(kind: PlanetKind, t: PlanetTheme): ReactNode {
  switch (kind) {
    case "moon":
      return (
        <g fill={t.shade}>
          <circle cx="22" cy="36" r="7" />
          <circle cx="58" cy="28" r="4.5" />
          <circle cx="80" cy="58" r="8" />
          <circle cx="42" cy="66" r="6" />
          <circle cx="6" cy="58" r="4" />
          <circle cx="66" cy="76" r="3" />
          <circle cx="24" cy="35" r="3.5" fill={t.detail} opacity="0.5" />
          <circle cx="82" cy="57" r="4" fill={t.detail} opacity="0.5" />
        </g>
      );
    case "desert":
      return (
        <g fill="none" strokeLinecap="round">
          <path
            d="M0 34 Q25 28 50 34 T100 34"
            stroke={t.detail}
            strokeWidth="3"
          />
          <path
            d="M0 48 Q25 42 50 48 T100 48"
            stroke={t.shade}
            strokeWidth="5"
          />
          <path
            d="M0 64 Q25 58 50 64 T100 64"
            stroke={t.detail}
            strokeWidth="3"
          />
          <path
            d="M0 76 Q25 70 50 76 T100 76"
            stroke={t.shade}
            strokeWidth="4"
          />
          <circle cx="70" cy="56" r="4" fill={t.shade} stroke="none" />
        </g>
      );
    case "ice":
      return (
        <g>
          <path d="M0 14 H100 V26 Q75 32 50 26 T0 26 Z" fill={t.detail} />
          <path d="M0 86 H100 V76 Q75 70 50 76 T0 76 Z" fill={t.detail} />
          <path
            d="M10 40 L22 48 L18 58 M48 36 L56 46 L68 44 M74 56 L86 64 L84 72 M30 62 L40 68"
            fill="none"
            stroke={t.shade}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    case "ringed":
    case "storm":
      return (
        <g>
          <rect x="0" y="28" width="100" height="6" fill={t.shade} />
          <rect
            x="0"
            y="40"
            width="100"
            height="4"
            fill={t.detail}
            opacity="0.7"
          />
          <rect x="0" y="52" width="100" height="8" fill={t.shade} />
          <rect
            x="0"
            y="66"
            width="100"
            height="4"
            fill={t.detail}
            opacity="0.7"
          />
          {kind === "storm" && (
            <ellipse
              cx="66"
              cy="56"
              rx="11"
              ry="6.5"
              fill={t.detail}
              stroke={t.shade}
              strokeWidth="2.5"
            />
          )}
        </g>
      );
    case "lava":
      return (
        <g>
          <path
            d="M0 40 L14 46 L24 38 L40 50 L52 44 M60 30 L68 42 L82 40 L100 40 M20 70 L34 62 L48 70 L62 64 L78 72 L90 66"
            fill="none"
            stroke={t.detail}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="40" cy="50" r="4" fill={t.detail} />
          <circle cx="78" cy="72" r="3" fill={t.detail} />
          <circle cx="12" cy="58" r="5" fill={t.shade} />
        </g>
      );
    case "ocean":
      return (
        <g fill={t.detail}>
          <polygon points={star(18, 36, 7)} />
          <polygon points={star(56, 58, 9)} />
          <polygon points={star(86, 32, 5)} />
          <polygon points={star(34, 72, 5)} />
          <ellipse cx="74" cy="76" rx="6" ry="3" fill={t.shade} />
        </g>
      );
    case "jungle":
      return (
        <g>
          <g fill={t.shade}>
            <circle cx="14" cy="34" r="7" />
            <circle cx="22" cy="40" r="6" />
            <circle cx="60" cy="30" r="5" />
            <circle cx="70" cy="62" r="9" />
            <circle cx="80" cy="56" r="6" />
            <circle cx="36" cy="70" r="6" />
          </g>
          <path
            d="M0 52 Q20 46 40 54 T80 48 T100 52"
            fill="none"
            stroke={t.detail}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    case "canyon":
      return (
        <g
          fill="none"
          stroke={t.shade}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M0 42 L12 38 L22 46 L36 40 L50 48 L64 42 L80 50 L100 42"
            strokeWidth="3.5"
          />
          <path d="M6 64 L20 58 L34 66 L50 60 L66 68 L84 62" strokeWidth="3" />
          <path
            d="M24 28 L40 30 M70 30 L86 26"
            stroke={t.detail}
            strokeWidth="2"
          />
        </g>
      );
    case "crystal":
      return (
        <g>
          <polygon
            points="8,30 22,24 28,40 14,46"
            fill={t.detail}
            opacity="0.85"
          />
          <polygon points="40,50 56,42 62,60 46,66" fill={t.shade} />
          <polygon points="70,26 84,30 80,44 68,40" fill={t.shade} />
          <polygon
            points="78,58 94,62 88,76 74,72"
            fill={t.detail}
            opacity="0.85"
          />
          <polygon
            points="22,62 32,58 34,72 24,76"
            fill={t.detail}
            opacity="0.6"
          />
        </g>
      );
    case "aurora":
      return (
        <g>
          <g fill={t.shade}>
            <ellipse cx="22" cy="58" rx="12" ry="7" />
            <ellipse cx="70" cy="66" rx="10" ry="6" />
          </g>
          <g fill="none" stroke={t.detail} strokeLinecap="round">
            <path
              d="M0 26 Q12 20 25 26 T50 26 T75 26 T100 26"
              strokeWidth="3"
            />
            <path
              d="M0 33 Q12 29 25 33 T50 33 T75 33 T100 33"
              strokeWidth="2"
              opacity="0.6"
            />
          </g>
        </g>
      );
    case "outpost":
      return (
        <g>
          <g fill={t.shade}>
            <ellipse cx="20" cy="40" rx="12" ry="8" />
            <ellipse cx="66" cy="60" rx="14" ry="9" />
          </g>
          <g fill={t.detail}>
            <circle cx="16" cy="38" r="1.6" />
            <circle cx="22" cy="42" r="1.2" />
            <circle cx="26" cy="37" r="1.4" />
            <circle cx="60" cy="58" r="1.6" />
            <circle cx="68" cy="62" r="1.2" />
            <circle cx="72" cy="56" r="1.5" />
            <circle cx="44" cy="74" r="1.2" />
          </g>
        </g>
      );
  }
}

export function PlanetArt({
  theme,
  spinning = false,
  className = "",
}: {
  theme: PlanetTheme;
  /** Slowly turn the planet (game background). Off on the map. */
  spinning?: boolean;
  className?: string;
}) {
  // Unique ids so several planets on one page don't share gradients.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `clip${id}`;
  const shine = `shine${id}`;
  const ring = theme.ring;
  const ringProps = ring && {
    fill: "none",
    stroke: ring.color,
    strokeWidth: ring.style === "solid" ? 5 : 3,
    strokeDasharray: ring.style === "belt" ? "0.5 4" : undefined,
    strokeLinecap: "round" as const,
  };
  const details = surface(theme.kind, theme);

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
        {/* Light from the top-left, shadow on the bottom-right: looks round. */}
        <radialGradient id={shine} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0" />
          <stop offset="75%" stopColor="#000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      {/* Back half of the ring, behind the planet */}
      {ringProps && (
        <path
          d="M2 50 A48 13 0 0 1 98 50"
          transform="rotate(-12 50 50)"
          {...ringProps}
        />
      )}

      <g clipPath={`url(#${clip})`}>
        <circle cx={CX} cy={CY} r={R} fill={theme.body} />
        <g className={spinning ? "planet-spin" : undefined}>
          {details}
          <g transform="translate(100 0)">{details}</g>
        </g>
        <circle cx={CX} cy={CY} r={R} fill={`url(#${shine})`} />
      </g>

      {/* Front half of the ring, in front of the planet */}
      {ringProps && (
        <path
          d="M2 50 A48 13 0 0 0 98 50"
          transform="rotate(-12 50 50)"
          {...ringProps}
        />
      )}
    </svg>
  );
}

/**
 * The game background layers: drifting stars and the level's planet.
 * Purely decorative and never catches taps.
 */
export function PlanetBackdrop({
  theme,
  planetOpacity,
  side = "right",
}: {
  theme: PlanetTheme;
  planetOpacity: number;
  /** Which side the planet floats on. Typing levels use "left", because in
   *  landscape the keypad covers the right side of the screen. */
  side?: "left" | "right";
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="star-drift absolute inset-x-0 -top-full h-[200%]" />
      <div
        className={`absolute top-[7%] size-[min(78vw,52vh)] ${side === "left" ? "-left-[14%]" : "-right-[14%]"}`}
        style={{ opacity: planetOpacity }}
      >
        <PlanetArt theme={theme} spinning className="size-full" />
      </div>
    </div>
  );
}
