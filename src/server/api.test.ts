// @vitest-environment node
import { describe, expect, it } from "vitest";
import { safeEqual } from "./api";

describe("safeEqual (constant-time family code check)", () => {
  it("matches only identical strings", () => {
    expect(safeEqual("moon-pie-42", "moon-pie-42")).toBe(true);
    expect(safeEqual("moon-pie-42", "moon-pie-4")).toBe(false);
    expect(safeEqual("moon-pie-42", "Moon-pie-42")).toBe(false);
    expect(safeEqual("", "moon-pie-42")).toBe(false);
  });
  it("handles different lengths and non-ASCII without throwing", () => {
    expect(safeEqual("a", "a".repeat(1000))).toBe(false);
    expect(safeEqual("🚀", "🚀")).toBe(true);
  });
});
