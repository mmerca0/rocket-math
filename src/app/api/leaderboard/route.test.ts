// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV, apiRequest, fakeDb } from "@/server/test-utils";
import { resetSupabaseForTests } from "@/server/supabase";
import { GET } from "./route";

vi.mock("@supabase/supabase-js", async () =>
  (await import("@/server/test-utils")).supabaseMock(),
);
// connection() only works inside a real Next.js request.
vi.mock("next/server", () => ({ connection: async () => {} }));

const row = {
  id: "33333333-3333-4333-8333-333333333333",
  pilot_id: "11111111-1111-4111-8111-111111111111",
  score: 900,
  accuracy: 95,
  played_at: "2026-11-20T10:00:00.000Z",
  pilot: { name: "Leo" },
};

/** Pass `null` to send no family code header at all. */
function get(level: string, code: string | null = TEST_ENV.FAMILY_CODE) {
  return GET(
    apiRequest(`/api/leaderboard?level=${encodeURIComponent(level)}`, {
      code: code ?? undefined,
    }),
  );
}

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(TEST_ENV)) vi.stubEnv(k, v);
  resetSupabaseForTests();
  fakeDb.reset(() => ({ data: [row] }));
});

describe("GET /api/leaderboard", () => {
  it("rejects a missing or wrong family code", async () => {
    expect((await get("1", null)).status).toBe(401);
    expect((await get("1", "nope")).status).toBe(401);
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("rejects an unknown level", async () => {
    for (const level of ["0", "11", "9", "9c", ""]) {
      const res = await get(level);
      expect(res.status).toBe(400);
    }
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("returns the top 10 for the level, highest first", async () => {
    const res = await get("10b");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      level: "10b",
      scores: [
        {
          id: row.id,
          pilot_id: row.pilot_id,
          name: "Leo",
          score: 900,
          accuracy: 95,
          played_at: row.played_at,
        },
      ],
    });
    const q = fakeDb.queries[0]!;
    expect(q.table).toBe("math_scores");
    expect(q.filters).toEqual([["level", "10b"]]);
    expect(q.orders.map(([c]) => c)).toEqual(["score", "played_at"]);
    expect(q.limit).toBe(10);
  });

  it("answers 503 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeDb.reset(() => ({ error: { message: "paused" } }));
    const res = await get("1");
    expect(res.status).toBe(503);
  });
});
