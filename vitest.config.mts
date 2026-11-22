import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Understand the "@/..." import shortcut from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // Next.js handles `import "server-only"` itself during builds. Tests
      // don't go through Next, so point it at the empty file Next ships.
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
