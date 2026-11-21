import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * Draws the app icon: the first letter of the app name on a coloured square.
 * Used by icon.tsx (browser tab + manifest) and apple-icon.tsx (iPhone home screen).
 * Replace with a real design later by dropping icon.png / apple-icon.png into src/app.
 */
export function renderAppIcon(size: number) {
  const letter = site.name.trim().charAt(0).toUpperCase() || "A";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: site.colors.accent,
        color: "#ffffff",
        fontSize: size * 0.6,
      }}
    >
      {letter}
    </div>,
    { width: size, height: size },
  );
}
