// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_ENV,
  apiRequest,
  fakeDb,
  type FakeQuery,
} from "@/server/test-utils";
import { resetSupabaseForTests } from "@/server/supabase";
import { POST } from "./route";

vi.mock("@supabase/supabase-js", async () =>
  (await import("@/server/test-utils")).supabaseMock(),
);

const LEO = "11111111-1111-4111-8111-111111111111";
const LEO_ON_SERVER = "22222222-2222-4222-8222-222222222222";
const SCORE = "33333333-3333-4333-8333-333333333333";
const NOW = new Date().toISOString();

const pilot = { id: LEO, name: "Leo", created_at: NOW };
const score = {
  id: SCORE,
  pilot_id: LEO,
  level: "9a",
  score: 450,
  accuracy: 90,
  played_at: NOW,
};

/** Pass `null` to send no family code header at all. */
function sync(body: unknown, code: string | null = TEST_ENV.FAMILY_CODE) {
  return POST(apiRequest("/api/sync", { code: code ?? undefined, body }));
}

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(TEST_ENV)) vi.stubEnv(k, v);
  resetSupabaseForTests();
  fakeDb.reset();
});

describe("POST /api/sync — family code", () => {
  it("rejects a missing code without touching the database", async () => {
    const res = await sync({ pilots: [], scores: [] }, null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "wrong-family-code" });
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("rejects a wrong code", async () => {
    const res = await sync({ pilots: [], scores: [] }, "moon-pie-43");
    expect(res.status).toBe(401);
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("rejects an empty code even if it would 'match' something empty", async () => {
    const res = await sync({ pilots: [], scores: [] }, "   ");
    expect(res.status).toBe(401);
  });

  it("refuses everything when FAMILY_CODE isn't set on the server", async () => {
    vi.stubEnv("FAMILY_CODE", "");
    const res = await sync({ pilots: [], scores: [] }, "");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not-configured" });
  });

  it("accepts the right code, ignoring surrounding spaces", async () => {
    const res = await sync({ pilots: [], scores: [] }, " moon-pie-42 ");
    expect(res.status).toBe(200);
  });

  it("accepts codes with emoji (sent URI-encoded)", async () => {
    vi.stubEnv("FAMILY_CODE", "🚀rocket");
    const res = await sync({ pilots: [], scores: [] }, "🚀rocket");
    expect(res.status).toBe(200);
  });

  it("checks the code before validating the body", async () => {
    const res = await sync("not json", "wrong");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/sync — validation", () => {
  const bad: [string, unknown][] = [
    ["not JSON", "{oops"],
    ["missing arrays", {}],
    [
      "pilot name too long",
      { pilots: [{ ...pilot, name: "x".repeat(21) }], scores: [] },
    ],
    ["empty pilot name", { pilots: [{ ...pilot, name: "" }], scores: [] }],
    [
      "untrimmed pilot name",
      { pilots: [{ ...pilot, name: " Leo" }], scores: [] },
    ],
    ["pilot id not a UUID", { pilots: [{ ...pilot, id: "p1" }], scores: [] }],
    ["unknown level", { pilots: [pilot], scores: [{ ...score, level: "11" }] }],
    ["negative score", { pilots: [pilot], scores: [{ ...score, score: -1 }] }],
    [
      "huge score",
      { pilots: [pilot], scores: [{ ...score, score: 1_000_001 }] },
    ],
    [
      "fractional score",
      { pilots: [pilot], scores: [{ ...score, score: 1.5 }] },
    ],
    [
      "accuracy over 100",
      { pilots: [pilot], scores: [{ ...score, accuracy: 101 }] },
    ],
    [
      "date far in the future",
      {
        pilots: [pilot],
        scores: [{ ...score, played_at: "2999-01-01T00:00:00Z" }],
      },
    ],
    [
      "not a date",
      { pilots: [pilot], scores: [{ ...score, played_at: "yesterday" }] },
    ],
    [
      "too many scores",
      { pilots: [pilot], scores: Array.from({ length: 501 }, () => score) },
    ],
  ];

  it.each(bad)("rejects %s with 400 and no database calls", async (_, body) => {
    const res = await sync(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid-request");
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("accepts a 20-character name and null accuracy (older scores)", async () => {
    const res = await sync({
      pilots: [{ ...pilot, name: "x".repeat(20) }],
      scores: [{ ...score, accuracy: null }],
    });
    expect(res.status).toBe(200);
  });

  it("refuses very large bodies", async () => {
    const res = await sync("x".repeat(200_001));
    expect(res.status).toBe(413);
  });
});

describe("POST /api/sync — storing data", () => {
  it("uses the server-side Supabase env vars", async () => {
    await sync({ pilots: [], scores: [] });
    expect(fakeDb.createClientCalls[0]?.slice(0, 2)).toEqual([
      TEST_ENV.SUPABASE_URL,
      TEST_ENV.SUPABASE_SECRET_KEY,
    ]);
  });

  it("inserts new pilots and scores, ignoring ones it already has", async () => {
    const res = await sync({ pilots: [pilot], scores: [score] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      pilots: [pilot],
      idMap: { [LEO]: LEO },
      acceptedScoreIds: [SCORE],
    });
    const writes = fakeDb.queries.filter((q) => q.op === "upsert");
    expect(writes.map((q) => q.table)).toEqual(["math_pilots", "math_scores"]);
    for (const w of writes) {
      expect(w.options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    }
  });

  it("merges a same-name pilot from another device instead of duplicating", async () => {
    fakeDb.reset((q) =>
      q.table === "math_pilots" && q.op === "select"
        ? { data: [{ id: LEO_ON_SERVER, name: "leo", created_at: NOW }] }
        : { data: null },
    );
    const res = await sync({ pilots: [pilot], scores: [score] });
    const body = await res.json();
    expect(body.idMap).toEqual({ [LEO]: LEO_ON_SERVER });
    // No pilot inserted; the score is filed under the existing pilot.
    const writes = fakeDb.queries.filter((q) => q.op === "upsert");
    expect(writes.map((q) => q.table)).toEqual(["math_scores"]);
    expect((writes[0]?.rows as { pilot_id: string }[])[0]?.pilot_id).toBe(
      LEO_ON_SERVER,
    );
  });

  it("retries once when two devices add the same name at the same time", async () => {
    let pilotSelects = 0;
    let pilotUpserts = 0;
    fakeDb.reset((q: FakeQuery) => {
      if (q.table === "math_pilots" && q.op === "select") {
        pilotSelects++;
        return {
          data:
            pilotSelects === 1
              ? []
              : [{ id: LEO_ON_SERVER, name: "Leo", created_at: NOW }],
        };
      }
      if (q.table === "math_pilots" && q.op === "upsert") {
        pilotUpserts++;
        return { error: { message: "duplicate key", code: "23505" } };
      }
      return { data: null };
    });
    const res = await sync({ pilots: [pilot], scores: [score] });
    expect(res.status).toBe(200);
    expect((await res.json()).idMap).toEqual({ [LEO]: LEO_ON_SERVER });
    expect(pilotUpserts).toBe(1);
  });

  it("skips scores whose pilot isn't known", async () => {
    const res = await sync({ pilots: [], scores: [score] });
    expect((await res.json()).acceptedScoreIds).toEqual([]);
    expect(fakeDb.queries.some((q) => q.table === "math_scores")).toBe(false);
  });

  it("answers 503 (so the game stays offline) when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeDb.reset(() => ({ error: { message: "boom", code: "XX000" } }));
    const res = await sync({ pilots: [pilot], scores: [] });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "database-unavailable" });
  });

  it("answers 503 not-configured when Supabase env vars are missing", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const res = await sync({ pilots: [], scores: [] });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not-configured" });
  });

  it("tells browsers and CDNs not to cache", async () => {
    const res = await sync({ pilots: [], scores: [] });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
