import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildFailureWindowPayload,
  buildSuccessWindowPayload,
  getSuccessfulWindowsForCoverage,
  isSyncWindowFresh
} from "./syncWindowRepository.js";
import { getSupabaseOrThrow } from "./supabaseRepository.js";

vi.mock("./supabaseRepository.js", () => ({
  getSupabaseOrThrow: vi.fn()
}));

const mockedGetSupabaseOrThrow = vi.mocked(getSupabaseOrThrow);

function buildCoverageQueryMock(rows: unknown[] = []) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    not: vi.fn(() => query),
    lte: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    then: vi.fn((resolve: (value: { data: unknown[]; error: null }) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve)
    )
  };

  const client = {
    from: vi.fn(() => query)
  };

  mockedGetSupabaseOrThrow.mockReturnValue(client as never);

  return { client, query };
}

describe("syncWindowRepository", () => {
  beforeEach(() => {
    mockedGetSupabaseOrThrow.mockReset();
  });

  it("builds success and failure payloads with stable TTL semantics", () => {
    const now = new Date("2026-05-26T00:00:00.000Z");

    expect(
      buildSuccessWindowPayload({
        source: "pandascore",
        game: "lol",
        from_date: "2026-05-24",
        to_date: "2026-05-26",
        status_group: "results_running",
        ttlSeconds: 900,
        now
      })
    ).toMatchObject({
      source: "pandascore",
      game: "lol",
      from_date: "2026-05-24",
      to_date: "2026-05-26",
      status_group: "results_running",
      last_synced_at: "2026-05-26T00:00:00.000Z",
      expires_at: "2026-05-26T00:15:00.000Z",
      last_error_code: null,
      last_error_message: null
    });

    expect(
      buildFailureWindowPayload({
        source: "pandascore",
        game: "lol",
        from_date: "2026-05-24",
        to_date: "2026-05-26",
        status_group: "results_running",
        errorCode: "PANDASCORE_TIMEOUT",
        errorMessage: "timeout",
        retryAfterSeconds: 60,
        now
      })
    ).toMatchObject({
      source: "pandascore",
      game: "lol",
      from_date: "2026-05-24",
      to_date: "2026-05-26",
      status_group: "results_running",
      expires_at: "2026-05-26T00:01:00.000Z",
      last_error_code: "PANDASCORE_TIMEOUT",
      last_error_message: "timeout"
    });
  });

  it("identifies freshness by expires_at", () => {
    expect(
      isSyncWindowFresh(
        {
          id: "1",
          source: "pandascore",
          game: "cs2",
          from_date: "2026-05-24",
          to_date: "2026-05-26",
          status_group: "all",
          last_synced_at: "2026-05-26T00:00:00.000Z",
          expires_at: "2026-05-26T00:15:00.000Z",
          last_error_code: null,
          last_error_message: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z"
        },
        new Date("2026-05-26T00:10:00.000Z")
      )
    ).toBe(true);

    expect(
      isSyncWindowFresh(
        {
          id: "1",
          source: "pandascore",
          game: "cs2",
          from_date: "2026-05-24",
          to_date: "2026-05-26",
          status_group: "all",
          last_synced_at: "2026-05-26T00:00:00.000Z",
          expires_at: "2026-05-26T00:15:00.000Z",
          last_error_code: null,
          last_error_message: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z"
        },
        new Date("2026-05-26T00:20:00.000Z")
      )
    ).toBe(false);
  });

  it("queries legacy and current finished coverage windows across date overlaps", async () => {
    const { client, query } = buildCoverageQueryMock([
      {
        id: "window-1",
        source: "pandascore",
        game: "lol",
        from_date: "2026-05-04",
        to_date: "2026-05-10",
        status_group: "schedule_finished",
        last_synced_at: "2026-05-10T00:00:00.000Z",
        expires_at: "2026-05-10T00:15:00.000Z",
        last_error_code: null,
        last_error_message: null,
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z"
      }
    ]);

    const windows = await getSuccessfulWindowsForCoverage({
      source: "pandascore",
      game: "lol",
      from_date: "2026-05-04",
      to_date: "2026-05-18",
      status_groups: ["finished", "schedule_finished", "results_finished"]
    });

    expect(windows).toHaveLength(1);
    expect(client.from).toHaveBeenCalledWith("match_fetch_windows");
    expect(query.select).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("source", "pandascore");
    expect(query.eq).toHaveBeenCalledWith("game", "lol");
    expect(query.in).toHaveBeenCalledWith("status_group", ["finished", "schedule_finished", "results_finished"]);
    expect(query.not).toHaveBeenCalledWith("last_synced_at", "is", null);
    expect(query.lte).toHaveBeenCalledWith("from_date", "2026-05-18");
    expect(query.gte).toHaveBeenCalledWith("to_date", "2026-05-04");
    expect(query.order).toHaveBeenNthCalledWith(1, "from_date", { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(2, "to_date", { ascending: true });
  });
});
