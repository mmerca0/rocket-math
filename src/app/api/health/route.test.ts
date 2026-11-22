// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV, fakeDb } from "@/server/test-utils";
import { resetSupabaseForTests } from "@/server/supabase";
import { GET } from "./route";

vi.mock("@supabase/supabase-js", async () =>
  (await import("@/server/test-utils")).supabaseMock(),
);
// connection() only works inside a real Next.js request.
vi.mock("next/server", () => ({ connection: async () => {} }));

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(TEST_ENV)) vi.stubEnv(k, v);
  resetSupabaseForTests();
  fakeDb.reset(() => ({ data: [{ id: "x" }] }));
});

describe("GET /api/health", () => {
  it("runs one tiny query and reports ok (no family code needed)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fakeDb.queries).toHaveLength(1);
    expect(fakeDb.queries[0]).toMatchObject({
      table: "math_pilots",
      columns: "id",
      limit: 1,
    });
  });

  it("answers 503 when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeDb.reset(() => ({ error: { message: "project paused" } }));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: "database-unavailable",
    });
  });

  it("answers 503 not-configured without env vars", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "not-configured" });
  });
});
