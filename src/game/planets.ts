/**
 * Planet themes: one per level. This is the ONE place to tweak planet colours.
 *
 * Every colour must be a 6-digit hex like "#1e2340". `planets.test.ts`
 * checks that asteroids, numbers and the problem stay easy to read on every
 * background, so after changing a colour run `npm run test`. If a contrast
 * test fails, make that sky / panel / ground colour darker.
 *
 * All planets are our own invention and are drawn in code
 * (see `src/components/PlanetArt.tsx`).
 */
import type { LevelId } from "./levels";

/** Decides which surface details get drawn on the planet. */
export type PlanetKind =
  | "moon"
  | "desert"
  | "ice"
  | "ringed"
  | "lava"
  | "ocean"
  | "storm"
  | "jungle"
  | "canyon"
  | "crystal"
  | "aurora"
  | "outpost";

export interface PlanetTheme {
  kind: PlanetKind;
  /** Kid-friendly description, e.g. "a red desert planet". */
  description: string;
  /** Planet colours (bright, as shown on the map). */
  body: string;
  /** Darker colour for craters, bands, forests… */
  shade: string;
  /** Light colour for highlights: ice caps, lava, starfish, city lights… */
  detail: string;
  /** Optional ring: a solid ring or a belt of little rocks. */
  ring?: { color: string; style: "solid" | "belt" };
  /** In-game background. Keep these DARK so the bright asteroids pop. */
  sky: {
    top: string;
    bottom: string;
    /** Soft coloured glow in the bottom-left corner. */
    glow: string;
  };
  /** Problem panel (and keypad) background. Keep it very dark. */
  panel: string;
  /** Planet surface strip at the bottom of the play field. */
  ground: string;
  /** Thin bright line on top of the ground: "rocks must not reach here". */
  groundEdge: string;
}

export const PLANETS: Record<LevelId, PlanetTheme> = {
  "1": {
    kind: "moon",
    description: "a grey moon covered in craters",
    body: "#b6c0cf",
    shade: "#94a3b8",
    detail: "#cfd6df",
    sky: { top: "#0b1026", bottom: "#1b2140", glow: "#475569" },
    panel: "#121831",
    ground: "#2f3a4f",
    groundEdge: "#cbd5e1",
  },
  "2": {
    kind: "desert",
    description: "a red desert planet with sand dunes",
    body: "#ea580c",
    shade: "#9a3412",
    detail: "#fdba74",
    sky: { top: "#1c0907", bottom: "#36120a", glow: "#b45309" },
    panel: "#230b07",
    ground: "#6b260f",
    groundEdge: "#fb923c",
  },
  "3": {
    kind: "ice",
    description: "an icy planet with snowy poles",
    body: "#6cc8f5",
    shade: "#0284c7",
    detail: "#b0d0e8",
    sky: { top: "#03132a", bottom: "#0a2746", glow: "#0369a1" },
    panel: "#051a33",
    ground: "#1f4e74",
    groundEdge: "#e0f2fe",
  },
  "4": {
    kind: "ringed",
    description: "a golden gas giant with big rings",
    body: "#fbbf24",
    shade: "#b45309",
    detail: "#f3d68a",
    ring: { color: "#e8cd7c", style: "solid" },
    sky: { top: "#161004", bottom: "#2c1f07", glow: "#a16207" },
    panel: "#1e1505",
    ground: "#5c3a0e",
    groundEdge: "#fcd34d",
  },
  "5": {
    kind: "lava",
    description: "a lava planet with glowing cracks",
    body: "#57534e",
    shade: "#1c1917",
    detail: "#fb923c",
    sky: { top: "#1a0604", bottom: "#380c06", glow: "#dc2626" },
    panel: "#240806",
    ground: "#2a2422",
    groundEdge: "#f97316",
  },
  "6": {
    kind: "ocean",
    description: "an ocean planet with starfish islands",
    body: "#0ea5e9",
    shade: "#0369a1",
    detail: "#f9a8d4",
    sky: { top: "#120927", bottom: "#260e37", glow: "#be185d" },
    panel: "#1a0a2e",
    ground: "#0c4a6e",
    groundEdge: "#f9a8d4",
  },
  "7": {
    kind: "storm",
    description: "a purple giant with a swirling storm",
    body: "#a78bfa",
    shade: "#6d28d9",
    detail: "#d9d0fb",
    sky: { top: "#100a24", bottom: "#1f1040", glow: "#7c3aed" },
    panel: "#170d33",
    ground: "#3b1d6e",
    groundEdge: "#c4b5fd",
  },
  "8": {
    kind: "jungle",
    description: "a jungle planet with forests and rivers",
    body: "#22c55e",
    shade: "#166534",
    detail: "#38bdf8",
    sky: { top: "#03130b", bottom: "#082819", glow: "#15803d" },
    panel: "#051c0f",
    ground: "#14532d",
    groundEdge: "#4ade80",
  },
  "9a": {
    kind: "canyon",
    description: "a rocky canyon planet with a belt of boulders",
    body: "#c2773b",
    shade: "#7c4a1e",
    detail: "#f2cfa6",
    ring: { color: "#d6d3d1", style: "belt" },
    sky: { top: "#130e09", bottom: "#281b10", glow: "#92400e" },
    panel: "#1d140c",
    ground: "#57381c",
    groundEdge: "#e7b98a",
  },
  "9b": {
    kind: "crystal",
    description: "a sparkly crystal planet",
    body: "#26c4b0",
    shade: "#0f766e",
    detail: "#7fd2c1",
    sky: { top: "#03181a", bottom: "#073034", glow: "#0f766e" },
    panel: "#042124",
    ground: "#134e4a",
    groundEdge: "#5eead4",
  },
  "10a": {
    kind: "aurora",
    description: "a dark blue planet with green northern lights",
    body: "#3b5bdb",
    shade: "#1e3a8a",
    detail: "#4ade80",
    sky: { top: "#060a1f", bottom: "#0f1638", glow: "#15803d" },
    panel: "#0a102c",
    ground: "#1e293b",
    groundEdge: "#86efac",
  },
  "10b": {
    kind: "outpost",
    description: "a faraway red planet with glowing city lights",
    body: "#be123c",
    shade: "#6b0f2a",
    detail: "#fde047",
    sky: { top: "#12040e", bottom: "#2a0820", glow: "#9d174d" },
    panel: "#1c0516",
    ground: "#4a0e2b",
    groundEdge: "#fda4af",
  },
};

/** How see-through the big planet is in the game background (0–1). */
export const GAME_PLANET_OPACITY = 0.28;
/** How strong the corner glow is in the game background (0–1). */
export const SKY_GLOW_OPACITY = 0.4;

export function getPlanet(id: LevelId): PlanetTheme {
  return PLANETS[id];
}

/** The CSS `background` for the game screen. */
export function skyBackground(theme: PlanetTheme): string {
  const glowAlpha = Math.round(SKY_GLOW_OPACITY * 255)
    .toString(16)
    .padStart(2, "0");
  return [
    `radial-gradient(ellipse at 0% 100%, ${theme.sky.glow}${glowAlpha}, transparent 60%)`,
    `linear-gradient(180deg, ${theme.sky.top} 0%, ${theme.sky.bottom} 100%)`,
  ].join(", ");
}
