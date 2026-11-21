/**
 * App identity — the ONE place to rename a new app.
 *
 * Everything else (page title, home-screen name, manifest, icon letter)
 * reads from here, so renaming is a one-line change to `name`.
 */
const name = "Math Rocket";

export const site = {
  name,
  /** Shown under the icon on the iPhone home screen. Keep it short (~12 chars). */
  shortName: name,
  description: `${name} — blast asteroids by solving math problems.`,
  /** Background colours used by the manifest, splash screen and status bar. */
  colors: {
    light: "#eef2ff",
    dark: "#0b1026",
    /** Icon background. */
    accent: "#f97316",
  },
} as const;
