/**
 * TEST HELPER ONLY. A pretend Supabase client, so route tests run without a
 * database or network. Each test sets `fakeDb.handler` to decide what the
 * "database" answers, then checks `fakeDb.queries` to see what was asked.
 *
 * Use with:
 *   vi.mock("@supabase/supabase-js", async () =>
 *     (await import("@/server/test-utils")).supabaseMock());
 */

export interface FakeQuery {
  table: string;
  op: "select" | "insert" | "upsert";
  columns?: string;
  rows?: unknown;
  options?: unknown;
  filters: [string, unknown][];
  orders: [string, unknown][];
  limit?: number;
}

export interface FakeResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

export const fakeDb = {
  handler: (() => ({ data: [] })) as (q: FakeQuery) => FakeResult,
  queries: [] as FakeQuery[],
  createClientCalls: [] as unknown[][],
  reset(handler: (q: FakeQuery) => FakeResult = () => ({ data: [] })) {
    this.handler = handler;
    this.queries = [];
    this.createClientCalls = [];
  },
};

function from(table: string) {
  const q: FakeQuery = { table, op: "select", filters: [], orders: [] };
  const builder = {
    select(columns: string) {
      if (q.op === "select") q.columns = columns;
      return builder;
    },
    insert(rows: unknown, options?: unknown) {
      Object.assign(q, { op: "insert", rows, options });
      return builder;
    },
    upsert(rows: unknown, options?: unknown) {
      Object.assign(q, { op: "upsert", rows, options });
      return builder;
    },
    eq(column: string, value: unknown) {
      q.filters.push([column, value]);
      return builder;
    },
    order(column: string, options?: unknown) {
      q.orders.push([column, options]);
      return builder;
    },
    limit(n: number) {
      q.limit = n;
      return builder;
    },
    // Supabase queries are "thenable": awaiting one runs it.
    then<T>(
      resolve: (r: { data: unknown; error: FakeResult["error"] }) => T,
      reject?: (e: unknown) => T,
    ) {
      fakeDb.queries.push(q);
      return Promise.resolve()
        .then(() => fakeDb.handler(q))
        .then((r) => ({ data: r.data ?? null, error: r.error ?? null }))
        .then(resolve, reject);
    },
  };
  return builder;
}

/** Module replacement for "@supabase/supabase-js". */
export function supabaseMock() {
  return {
    createClient: (...args: unknown[]) => {
      fakeDb.createClientCalls.push(args);
      return { from };
    },
  };
}

/** Makes a Request like the browser would send. */
export function apiRequest(
  path: string,
  {
    code,
    body,
    method = body === undefined ? "GET" : "POST",
  }: { code?: string; body?: unknown; method?: string } = {},
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (code !== undefined) headers["x-family-code"] = encodeURIComponent(code);
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

/** Sets the server env vars the routes need, with test values. */
export const TEST_ENV = {
  FAMILY_CODE: "moon-pie-42",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
} as const;
