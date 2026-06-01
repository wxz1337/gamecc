import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ERROR_CODES } from "../../shared/errors.js";
import { addBeijingDays, getBeijingDateRangeUtc, getBeijingTodayDate } from "../../shared/date.js";
import type { Match, MatchQuery } from "../../shared/match.js";
import { mapPandaScoreMatch } from "../mappers/pandascoreMapper.js";
import type { PandaScoreMatch } from "../types/pandascore.js";
import { getMatches, getSourceWindowTtlSeconds } from "./matchService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";
import { createSyncRun, finishSyncRunFailure, finishSyncRunSuccess } from "../repositories/syncRunRepository.js";
import {
  getFreshWindow,
  getSuccessfulWindowsForCoverage,
  upsertFailedWindow,
  upsertSuccessWindow
} from "../repositories/syncWindowRepository.js";
import { queryMatchesByDateRange, upsertMatches } from "../repositories/matchRepository.js";

vi.mock("./pandascoreClient.js", () => ({
  fetchPandaScoreMatches: vi.fn()
}));

vi.mock("../repositories/matchRepository.js", () => ({
  queryMatchesByDateRange: vi.fn(),
  upsertMatches: vi.fn()
}));

vi.mock("../repositories/syncWindowRepository.js", () => ({
  getFreshWindow: vi.fn(),
  getSuccessfulWindowsForCoverage: vi.fn(),
  upsertFailedWindow: vi.fn(),
  upsertSuccessWindow: vi.fn()
}));

vi.mock("../repositories/syncRunRepository.js", () => ({
  createSyncRun: vi.fn(),
  finishSyncRunFailure: vi.fn(),
  finishSyncRunSuccess: vi.fn()
}));

vi.mock("./inFlightRequestService.js", () => ({
  runWithInFlightDeduplication: vi.fn((_key: string, factory: () => Promise<unknown>) => factory())
}));

const mockedFetchPandaScoreMatches = vi.mocked(fetchPandaScoreMatches);
const mockedGetFreshWindow = vi.mocked(getFreshWindow);
const mockedGetSuccessfulWindowsForCoverage = vi.mocked(getSuccessfulWindowsForCoverage);
const mockedQueryMatchesByDateRange = vi.mocked(queryMatchesByDateRange);
const mockedUpsertMatches = vi.mocked(upsertMatches);
const mockedCreateSyncRun = vi.mocked(createSyncRun);
const mockedFinishSyncRunSuccess = vi.mocked(finishSyncRunSuccess);
const mockedFinishSyncRunFailure = vi.mocked(finishSyncRunFailure);
const mockedUpsertSuccessWindow = vi.mocked(upsertSuccessWindow);
const mockedUpsertFailedWindow = vi.mocked(upsertFailedWindow);

function buildQuery(overrides: Partial<MatchQuery> = {}): MatchQuery {
  return {
    from: "2026-06-01",
    to: "2026-06-07",
    view: "results",
    game: "lol",
    status: "finished",
    tier: "S,A",
    sort: "beginAt_desc",
    refresh: false,
    ...overrides
  };
}

type RawMatchOverrides = {
  id?: number;
  name?: string;
  begin_at?: string;
  end_at?: string;
  status?: string;
  winner_id?: number;
  winner_name?: string;
  league?: string;
  serie?: string;
  tournament?: string;
  tier?: string;
  stage?: string;
  country?: string;
  region?: string;
  teamA?: string;
  teamB?: string;
  updated_at?: string;
};

function buildRawMatch(overrides: RawMatchOverrides): PandaScoreMatch {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Team Alpha vs Team Beta",
    begin_at: overrides.begin_at ?? "2026-05-03T12:00:00.000Z",
    end_at: overrides.end_at ?? "2026-05-03T14:00:00.000Z",
    original_scheduled_at: null,
    status: overrides.status ?? "finished",
    number_of_games: 3,
    match_type: "best_of",
    rescheduled: false,
    detailed_stats: true,
    draw: false,
    forfeit: false,
    winner_id: overrides.winner_id ?? 101,
    winner: { id: overrides.winner_id ?? 101, name: overrides.winner_name ?? "Team Alpha" },
    league: { name: overrides.league ?? "LPL", image_url: null },
    serie: { name: overrides.serie ?? "Spring", full_name: overrides.serie ?? "LPL Spring" },
    tournament: {
      name: overrides.tournament ?? "Playoffs",
      type: overrides.stage ?? "playoffs",
      country: overrides.country ?? "CN",
      region: overrides.region ?? "China",
      tier: overrides.tier ?? "S",
      prizepool: null,
      has_bracket: true,
      detailed_stats: true
    },
    opponents: [
      {
        opponent: {
          id: 101,
          name: overrides.teamA ?? "Team Alpha",
          acronym: "ALP",
          image_url: null,
          dark_mode_image_url: null,
          location: "CN"
        }
      },
      {
        opponent: {
          id: 102,
          name: overrides.teamB ?? "Team Beta",
          acronym: "BET",
          image_url: null,
          dark_mode_image_url: null,
          location: "KR"
        }
      }
    ],
    results: [
      { team_id: 101, score: 2 },
      { team_id: 102, score: 1 }
    ],
    games: [],
    streams_list: [],
    replay_url: null,
    updated_at: overrides.updated_at ?? "2026-05-03T14:10:00.000Z"
  };
}

function buildFreshWindow(overrides: Partial<Record<string, string>> = {}) {
  return {
    id: "window-1",
    source: "pandascore",
    game: "lol" as const,
    from_date: "2026-06-01",
    to_date: "2026-06-07",
    status_group: "finished",
    last_synced_at: "2026-05-03T14:10:00.000Z",
    expires_at: "2026-05-04T14:10:00.000Z",
    last_error_code: null,
    last_error_message: null,
    created_at: "2026-05-03T14:10:00.000Z",
    updated_at: "2026-05-03T14:10:00.000Z",
    ...overrides
  };
}

function buildMatch(overrides: RawMatchOverrides, game: "cs2" | "valorant" | "lol" = "lol"): Match {
  return mapPandaScoreMatch(buildRawMatch(overrides), game);
}

function buildHistoricalQuery(overrides: Partial<MatchQuery> = {}): MatchQuery {
  const today = getBeijingTodayDate();

  return buildQuery({
    from: addBeijingDays(today, -7),
    to: addBeijingDays(today, -1),
    refresh: false,
    ...overrides
  });
}

beforeEach(() => {
  mockedFetchPandaScoreMatches.mockReset();
  mockedGetFreshWindow.mockReset();
  mockedGetSuccessfulWindowsForCoverage.mockReset();
  mockedQueryMatchesByDateRange.mockReset();
  mockedUpsertMatches.mockReset();
  mockedCreateSyncRun.mockReset();
  mockedFinishSyncRunSuccess.mockReset();
  mockedFinishSyncRunFailure.mockReset();
  mockedUpsertSuccessWindow.mockReset();
  mockedUpsertFailedWindow.mockReset();

  mockedGetFreshWindow.mockResolvedValue(null);
  mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([]);
  mockedQueryMatchesByDateRange.mockResolvedValue([]);
  mockedUpsertMatches.mockResolvedValue(undefined);
  mockedCreateSyncRun.mockResolvedValue({
    id: "sync-run-1",
    source: "pandascore",
    game: "lol",
    from_date: "2026-06-01",
    to_date: "2026-06-07",
    status_group: "finished",
    started_at: "2026-05-03T14:10:00.000Z",
    finished_at: null,
    success: false,
    fetched_count: 0,
    upserted_count: 0,
    error_code: null,
    error_message: null
  });
  mockedFinishSyncRunSuccess.mockResolvedValue({
    id: "sync-run-1",
    source: "pandascore",
    game: "lol",
    from_date: "2026-06-01",
    to_date: "2026-06-07",
    status_group: "finished",
    started_at: "2026-05-03T14:10:00.000Z",
    finished_at: "2026-05-03T14:11:00.000Z",
    success: true,
    fetched_count: 1,
    upserted_count: 1,
    error_code: null,
    error_message: null
  });
  mockedFinishSyncRunFailure.mockResolvedValue({
    id: "sync-run-1",
    source: "pandascore",
    game: "lol",
    from_date: "2026-06-01",
    to_date: "2026-06-07",
    status_group: "finished",
    started_at: "2026-05-03T14:10:00.000Z",
    finished_at: "2026-05-03T14:11:00.000Z",
    success: false,
    fetched_count: 0,
    upserted_count: 0,
    error_code: ERROR_CODES.PANDASCORE_REQUEST_FAILED,
    error_message: "赛程数据暂时获取失败，请稍后重试。"
  });
  mockedUpsertSuccessWindow.mockResolvedValue(buildFreshWindow());
  mockedUpsertFailedWindow.mockResolvedValue(buildFreshWindow());

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("matchService supabase flow", () => {
  it("fills only the missing leading day for historical finished coverage", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-04";
    const to = "2026-05-18";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-05",
        to_date: "2026-05-10",
        status_group: "schedule_finished"
      }),
      buildFreshWindow({
        from_date: "2026-05-11",
        to_date: "2026-05-17",
        status_group: "results_finished"
      }),
      buildFreshWindow({
        from_date: "2026-05-18",
        to_date: "2026-05-24",
        status_group: "finished"
      })
    ]);
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 11,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Missing Leading Day Match"
      })
    ]);
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch({
        id: 11,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Missing Leading Day Match"
      })
    ]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(1);
    expect(mockedGetSuccessfulWindowsForCoverage).toHaveBeenCalledTimes(1);
    expect(mockedGetSuccessfulWindowsForCoverage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        from_date: from,
        to_date: to,
        status_groups: ["finished", "schedule_finished", "results_finished"]
      })
    );
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc("2026-05-04", "2026-05-04"),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        fromDate: from,
        toDate: to
      })
    );
    expect(mockedCreateSyncRun).toHaveBeenCalledTimes(1);
    expect(mockedUpsertMatches).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        from_date: "2026-05-04",
        to_date: "2026-05-04",
        status_group: "finished"
      })
    );
  });

  it("fills only the missing middle day for historical finished coverage", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-20";
    const to = "2026-05-28";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-20",
        to_date: "2026-05-25",
        status_group: "schedule_finished"
      }),
      buildFreshWindow({
        from_date: "2026-05-27",
        to_date: "2026-05-28",
        status_group: "results_finished"
      })
    ]);
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 12,
        begin_at: "2026-05-26T12:00:00.000Z",
        status: "finished",
        name: "Missing Middle Day Match"
      })
    ]);
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch({
        id: 12,
        begin_at: "2026-05-26T12:00:00.000Z",
        status: "finished",
        name: "Missing Middle Day Match"
      })
    ]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(1);
    expect(mockedGetSuccessfulWindowsForCoverage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        from_date: from,
        to_date: to,
        status_groups: ["finished", "schedule_finished", "results_finished"]
      })
    );
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc("2026-05-26", "2026-05-26"),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        from_date: "2026-05-26",
        to_date: "2026-05-26",
        status_group: "finished"
      })
    );
  });

  it("fills a consecutive missing range with one PandaScore request", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-01";
    const to = "2026-05-10";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-01",
        to_date: "2026-05-03",
        status_group: "schedule_finished"
      }),
      buildFreshWindow({
        from_date: "2026-05-06",
        to_date: "2026-05-10",
        status_group: "results_finished"
      })
    ]);
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 13,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Missing Consecutive Days Match"
      }),
      buildRawMatch({
        id: 14,
        begin_at: "2026-05-05T12:00:00.000Z",
        status: "finished",
        name: "Missing Consecutive Days Match 2"
      })
    ]);
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch({
        id: 13,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Missing Consecutive Days Match"
      }),
      buildMatch({
        id: 14,
        begin_at: "2026-05-05T12:00:00.000Z",
        status: "finished",
        name: "Missing Consecutive Days Match 2"
      })
    ]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(2);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc("2026-05-04", "2026-05-05"),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(2);
    expect(mockedUpsertSuccessWindow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        from_date: "2026-05-04",
        to_date: "2026-05-04",
        status_group: "finished"
      })
    );
    expect(mockedUpsertSuccessWindow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        from_date: "2026-05-05",
        to_date: "2026-05-05",
        status_group: "finished"
      })
    );
  });

  it("returns DB rows without calling PandaScore when coverage is complete", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-11";
    const to = "2026-05-17";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-11",
        to_date: "2026-05-13",
        status_group: "schedule_finished"
      }),
      buildFreshWindow({
        from_date: "2026-05-14",
        to_date: "2026-05-17",
        status_group: "results_finished"
      })
    ]);
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch({
        id: 15,
        begin_at: "2026-05-12T12:00:00.000Z",
        status: "finished",
        name: "Covered Historical Match"
      })
    ]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(1);
    expect(response.matches[0]).toMatchObject({
      id: "15",
      status: "finished"
    });
    expect(mockedFetchPandaScoreMatches).not.toHaveBeenCalled();
    expect(mockedGetFreshWindow).not.toHaveBeenCalled();
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedCreateSyncRun).not.toHaveBeenCalled();
    expect(mockedUpsertMatches).not.toHaveBeenCalled();
  });

  it("fills the whole range when there is no coverage", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-18";
    const to = "2026-05-24";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([]);
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 16,
        begin_at: "2026-05-18T12:00:00.000Z",
        status: "finished",
        name: "Whole Range Match"
      })
    ]);
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch({
        id: 16,
        begin_at: "2026-05-18T12:00:00.000Z",
        status: "finished",
        name: "Whole Range Match"
      })
    ]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc(from, to),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(7);
    expect(mockedCreateSyncRun).toHaveBeenCalledTimes(1);
  });

  it("writes a successful window even when a missing gap has no matches", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const from = "2026-05-25";
    const to = "2026-05-28";

    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-26",
        to_date: "2026-05-28",
        status_group: "results_finished"
      })
    ]);
    mockedFetchPandaScoreMatches.mockResolvedValue([]);
    mockedQueryMatchesByDateRange.mockResolvedValue([]);

    const response = await getMatches(
      buildQuery({
        from,
        to,
        refresh: false
      })
    );

    expect(response.total).toBe(0);
    expect(response.matches).toEqual([]);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc("2026-05-25", "2026-05-25"),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        from_date: "2026-05-25",
        to_date: "2026-05-25",
        status_group: "finished"
      })
    );
  });

  it("keeps finished historical source windows fresher than running ones", async () => {
    const today = getBeijingTodayDate();
    const historicalTtl = getSourceWindowTtlSeconds(
      buildQuery({ from: addBeijingDays(today, -7), to: addBeijingDays(today, -1), refresh: false })
    );
    const runningTtl = getSourceWindowTtlSeconds(
      buildQuery({ view: "schedule", status: "running", from: today, to: today })
    );

    expect(historicalTtl).toBeGreaterThan(runningTtl);
    expect(historicalTtl).toBe(30 * 24 * 60 * 60);
    expect(runningTtl).toBe(5 * 60);
  });

  it("uses a fresh Supabase window without calling PandaScore", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const match = buildMatch({
      id: 1,
      begin_at: "2026-05-02T12:00:00.000Z",
      status: "finished",
      name: "Fresh Match"
    });

    mockedGetFreshWindow.mockResolvedValue(buildFreshWindow());
    mockedQueryMatchesByDateRange.mockResolvedValue([match]);

    const response = await getMatches(buildQuery());

    expect(response.total).toBe(1);
    expect(response.matches[0]).toMatchObject({
      id: "1",
      status: "finished"
    });
    expect(mockedFetchPandaScoreMatches).not.toHaveBeenCalled();
    expect(mockedCreateSyncRun).not.toHaveBeenCalled();
    expect(mockedUpsertMatches).not.toHaveBeenCalled();
    expect(mockedGetFreshWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        from_date: "2026-06-01",
        to_date: "2026-06-07",
        status_group: "finished"
      })
    );
    expect(mockedGetSuccessfulWindowsForCoverage).not.toHaveBeenCalled();
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        fromDate: "2026-06-01",
        toDate: "2026-06-07",
        statuses: ["finished"]
      })
    );
  });

  it("keeps running queries on the existing fresh-window path", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const match = buildMatch({
      id: 15,
      begin_at: "2026-06-01T12:00:00.000Z",
      status: "running",
      name: "Running Match"
    });

    mockedGetFreshWindow.mockResolvedValue(
      buildFreshWindow({
        from_date: "2026-06-01",
        to_date: "2026-06-07",
        status_group: "schedule_running"
      })
    );
    mockedQueryMatchesByDateRange.mockResolvedValue([match]);

    const response = await getMatches(
      buildQuery({
        view: "schedule",
        status: "running"
      })
    );

    expect(response.total).toBe(1);
    expect(response.matches[0]).toMatchObject({
      id: "15",
      status: "running"
    });
    expect(mockedGetSuccessfulWindowsForCoverage).not.toHaveBeenCalled();
    expect(mockedFetchPandaScoreMatches).not.toHaveBeenCalled();
    expect(mockedGetFreshWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        from_date: "2026-06-01",
        to_date: "2026-06-07",
        status_group: "schedule_running"
      })
    );
    expect(mockedQueryMatchesByDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "pandascore",
        game: "lol",
        fromDate: "2026-06-01",
        toDate: "2026-06-07",
        statuses: ["not_started", "running"]
      })
    );
  });

  it("skips fresh Supabase windows when refresh=1 and persists the refreshed data", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 2,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Refreshed Match"
      })
    ]);
    mockedGetSuccessfulWindowsForCoverage.mockResolvedValue([
      buildFreshWindow({
        from_date: "2026-05-01",
        to_date: "2026-05-07",
        status_group: "finished"
      })
    ]);

    const response = await getMatches(buildQuery({ refresh: true }));

    expect(response.total).toBe(1);
    expect(mockedQueryMatchesByDateRange).not.toHaveBeenCalled();
    expect(mockedGetSuccessfulWindowsForCoverage).not.toHaveBeenCalled();
    expect(mockedGetFreshWindow).not.toHaveBeenCalled();
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      getBeijingDateRangeUtc("2026-06-01", "2026-06-07"),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
    expect(mockedCreateSyncRun).toHaveBeenCalledTimes(1);
    expect(mockedUpsertMatches).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(1);
    expect(mockedFinishSyncRunSuccess).toHaveBeenCalledTimes(1);
    expect(mockedCreateSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status_group: "finished"
      })
    );
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        status_group: "finished"
      })
    );
  });

  it("returns partial results when one game fails in game=all", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mockedFetchPandaScoreMatches.mockImplementation(async (game) => {
      if (game === "valorant") {
        throw new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504);
      }

      return [
        buildRawMatch({
          id: game === "cs2" ? 10 : 20,
          name: `${game} match`,
          league: game === "cs2" ? "ESL" : "LPL"
        })
      ];
    });

    const response = await getMatches(buildQuery({ game: "all", status: "all", sort: "beginAt_asc" }));

    expect(response.partial).toBe(true);
    expect(response.total).toBe(2);
    expect(response.matches.map((match) => match.game).sort()).toEqual(["cs2", "lol"]);
    expect(response.warnings).toEqual([
      {
        code: ERROR_CODES.PANDASCORE_TIMEOUT,
        message: "VALORANT 赛程数据暂时获取失败。",
        game: "valorant"
      }
    ]);
  });

  it("falls back to stale Supabase data when PandaScore fails in game=all", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mockedFetchPandaScoreMatches.mockImplementation(async (game) => {
      if (game === "valorant") {
        throw new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504);
      }

      return [
        buildRawMatch({
          id: game === "cs2" ? 10 : 20,
          name: `${game} match`,
          league: game === "cs2" ? "ESL" : "LPL"
        })
      ];
    });

    mockedQueryMatchesByDateRange.mockImplementation(async ({ game }) => {
      if (game === "valorant") {
        return [
          buildMatch({
            id: 30,
            begin_at: "2026-05-05T12:00:00.000Z",
            status: "finished",
            name: "Stale Valorant Match",
            league: "VCT",
            teamA: "Paper Rex",
            teamB: "DRX"
          }, "valorant")
        ];
      }

      return [];
    });

    const response = await getMatches(buildQuery({ game: "all", status: "all", sort: "beginAt_asc" }));

    expect(response.partial).toBe(true);
    expect(response.stale).toBe(true);
    expect(response.total).toBe(3);
    expect(response.matches.map((match) => match.game).sort()).toEqual(["cs2", "lol", "valorant"]);
    expect(response.warnings).toEqual([
      {
        code: ERROR_CODES.PANDASCORE_TIMEOUT,
        message: "VALORANT 赛程数据暂时获取失败。",
        game: "valorant"
      }
    ]);
  });

  it("falls back to stale Supabase data when PandaScore fails for a single game", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mockedFetchPandaScoreMatches.mockRejectedValue(
      new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504)
    );
    mockedQueryMatchesByDateRange.mockResolvedValue([
      buildMatch(
        {
          id: 31,
          begin_at: "2026-05-05T12:00:00.000Z",
          status: "finished",
          name: "Stale LoL Match",
          league: "LPL",
          teamA: "Bilibili Gaming",
          teamB: "Top Esports"
        },
        "lol"
      )
    ]);

    const response = await getMatches(buildQuery({ game: "lol", refresh: true }));

    expect(response.partial).toBe(true);
    expect(response.stale).toBe(true);
    expect(response.total).toBe(1);
    expect(response.matches[0]).toMatchObject({
      id: "31",
      game: "lol",
      status: "finished"
    });
    expect(response.warnings).toEqual([
      {
        code: ERROR_CODES.PANDASCORE_TIMEOUT,
        message: "LoL 赛程数据暂时获取失败。",
        game: "lol"
      }
    ]);
  });

  it("falls back to PandaScore when the Supabase schema is not ready", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mockedCreateSyncRun.mockRejectedValue(
      new AppError(ERROR_CODES.SUPABASE_SCHEMA_NOT_READY, "Supabase 表结构尚未部署。", 500)
    );
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 41,
        begin_at: "2026-05-06T12:00:00.000Z",
        status: "finished",
        name: "Direct Fallback Match"
      })
    ]);

    const response = await getMatches(buildQuery({ refresh: true }));

    expect(response.total).toBe(1);
    expect(response.stale).toBe(false);
    expect(mockedCreateSyncRun).toHaveBeenCalledTimes(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
  });

  it("keeps the old PandaScore-only path when Supabase is not configured", async () => {
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 40,
        begin_at: "2026-05-02T12:00:00.000Z",
        status: "finished",
        name: "Direct Match"
      })
    ]);

    const response = await getMatches(buildQuery({ from: "2026-06-08", to: "2026-06-14", refresh: true }));

    expect(response.total).toBe(1);
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedGetFreshWindow).not.toHaveBeenCalled();
    expect(mockedGetSuccessfulWindowsForCoverage).not.toHaveBeenCalled();
    expect(mockedCreateSyncRun).not.toHaveBeenCalled();
    expect(mockedUpsertMatches).not.toHaveBeenCalled();
  });
});
