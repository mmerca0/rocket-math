import { describe, expect, it } from "vitest";
import { BOSS_ROCK_COLOR, ROCK_COLORS } from "@/components/art";
import { LEVELS } from "./levels";
import { TIMER_COLORS } from "./timer";
import {
  GAME_PLANET_OPACITY,
  PLANETS,
  SKY_GLOW_OPACITY,
  getPlanet,
  skyBackground,
  type PlanetTheme,
} from "./planets";

// ---- WCAG contrast helpers (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio)

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Paint `top` at `alpha` over `bottom`, the way the browser does. */
function blend(top: string, alpha: number, bottom: string): Rgb {
  const t = hexToRgb(top);
  const b = hexToRgb(bottom);
  return [0, 1, 2].map((i) => alpha * t[i]! + (1 - alpha) * b[i]!) as Rgb;
}

function luminance(c: Rgb | string): number {
  const rgb = typeof c === "string" ? hexToRgb(c) : c;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb | string, b: Rgb | string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Every colour an asteroid or the top-bar text can end up in front of. */
function playFieldBackgrounds(t: PlanetTheme): { name: string; c: Rgb }[] {
  const out = [
    { name: "sky top", c: hexToRgb(t.sky.top) },
    { name: "sky bottom", c: hexToRgb(t.sky.bottom) },
    {
      name: "corner glow",
      c: blend(t.sky.glow, SKY_GLOW_OPACITY, t.sky.bottom),
    },
    { name: "ground", c: hexToRgb(t.ground) },
  ];
  const planetColours = [t.body, t.shade, t.detail, t.ring?.color].filter(
    (c): c is string => !!c,
  );
  // The planet floats in the top half of the screen, so it sits over the
  // sky between the top colour and the halfway colour.
  const skyMiddle = rgbToHex(blend(t.sky.top, 0.5, t.sky.bottom));
  for (const p of planetColours) {
    for (const sky of [t.sky.top, skyMiddle]) {
      out.push({
        name: `planet ${p} over ${sky}`,
        c: blend(p, GAME_PLANET_OPACITY, sky),
      });
    }
  }
  return out;
}

const WHITE = "#ffffff";
const ROCK_FILLS = [...ROCK_COLORS.map((r) => r.fill), BOSS_ROCK_COLOR.fill];
/** Accent colours used on the problem panel (Tailwind orange/amber/emerald-300). */
const PANEL_ACCENTS = ["#fdba74", "#fcd34d", "#6ee7b7"];

describe("planet themes", () => {
  it("every level has its own planet theme", () => {
    for (const level of LEVELS) {
      expect(getPlanet(level.id), level.id).toBeDefined();
    }
    const kinds = LEVELS.map((l) => getPlanet(l.id).kind);
    expect(new Set(kinds).size).toBe(LEVELS.length);
    expect(Object.keys(PLANETS).sort()).toEqual(LEVELS.map((l) => l.id).sort());
  });

  it("uses 6-digit hex colours only (so the contrast checks can read them)", () => {
    for (const [id, t] of Object.entries(PLANETS)) {
      const colours = [
        t.body,
        t.shade,
        t.detail,
        t.ring?.color,
        t.sky.top,
        t.sky.bottom,
        t.sky.glow,
        t.panel,
        t.ground,
        t.groundEdge,
      ].filter((c) => c !== undefined);
      for (const c of colours)
        expect(c, `level ${id}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("builds a CSS background from the theme", () => {
    const css = skyBackground(PLANETS["1"]);
    expect(css).toContain(PLANETS["1"].sky.top);
    expect(css).toContain(`${PLANETS["1"].sky.glow}66`);
  });

  describe.each(LEVELS.map((l) => [l.id, getPlanet(l.id)] as const))(
    "level %s stays easy to read",
    (_id, theme) => {
      it("asteroids stand out from everything behind them (≥ 3:1)", () => {
        for (const bg of playFieldBackgrounds(theme)) {
          for (const rock of ROCK_FILLS) {
            expect(
              contrast(rock, bg.c),
              `${rock} on ${bg.name}`,
            ).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it("top-bar text is readable over the sky and planet (≥ 4.5:1)", () => {
        for (const bg of playFieldBackgrounds(theme)) {
          // Labels like "SCORE" are white at 70% opacity.
          const label = blend(WHITE, 0.7, rgbToHex(bg.c));
          expect(
            contrast(label, bg.c),
            `label on ${bg.name}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      it("every timer-bar colour stands out from the sky (≥ 3:1)", () => {
        for (const bg of playFieldBackgrounds(theme)) {
          for (const [name, c] of Object.entries(TIMER_COLORS)) {
            expect(
              contrast(c, bg.c),
              `${name} on ${bg.name}`,
            ).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it("the problem is very easy to read on the panel", () => {
        expect(contrast(WHITE, theme.panel)).toBeGreaterThanOrEqual(7);
        for (const accent of PANEL_ACCENTS) {
          expect(contrast(accent, theme.panel), accent).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      });
    },
  );

  it("answer numbers are readable on every asteroid (≥ 7:1)", () => {
    for (const rock of ROCK_FILLS) {
      expect(contrast("#020617", rock), rock).toBeGreaterThanOrEqual(7);
    }
  });
});

function rgbToHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
