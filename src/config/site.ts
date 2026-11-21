/**
 * App identity — the ONE place to rename a new app.
 *
 * Everything else (page title, home-screen name, manifest, icon letter)
 * reads from here, so renaming is a one-line change to `name`.
 */
const name = "New app";

export const site = {
  name,
  /** Shown under the icon on the iPhone home screen. Keep it short (~12 chars). */
  shortName: name,
  description: `${name} — a personal web app.`,
  /** Background colours used by the manifest, splash screen and status bar. */
  colors: {
    light: "#ffffff",
    dark: "#0a0a0a",
    /** Icon background. */
    accent: "#2563eb",
  },
} as const;
