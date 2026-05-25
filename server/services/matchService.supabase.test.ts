import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ERROR_CODES } from "../../shared/errors.js";
import type { Match, MatchQuery } from "../../shared/match.js";
import { mapPandaScoreMatch } from "../mappers/pandascoreMapper.js";
import type { PandaScoreMatch } from "../types/pandascore.js";
import { getMatches } from "./matchService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";
import { createSyncRun, finishSyncRunFailure, finishSyncRunSuccess } from "../repositories/syncRunRepository.js";
import { getFreshWindow, upsertFailedWindow, upsertSuccessWindow } from "../repositories/syncWindowRepository.js";
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
    status_group: "results_finished",
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

beforeEach(() => {
  mockedFetchPandaScoreMatches.mockReset();
  mockedGetFreshWindow.mockReset();
  mockedQueryMatchesByDateRange.mockReset();
  mockedUpsertMatches.mockReset();
  mockedCreateSyncRun.mockReset();
  mockedFinishSyncRunSuccess.mockReset();
  mockedFinishSyncRunFailure.mockReset();
  mockedUpsertSuccessWindow.mockReset();
  mockedUpsertFailedWindow.mockReset();

  mockedGetFreshWindow.mockResolvedValue(null);
  mockedQueryMatchesByDateRange.mockResolvedValue([]);
  mockedUpsertMatches.mockResolvedValue(undefined);
  mockedCreateSyncRun.mockResolvedValue({
    id: "sync-run-1",
    source: "pandascore",
    game: "lol",
    from_date: "2026-06-01",
    to_date: "2026-06-07",
    status_group: "results_finished",
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
    status_group: "results_finished",
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
    status_group: "results_finished",
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
  delete process.env.SOURCE_WINDOW_TTL_SECONDS;
});

describe("matchService supabase flow", () => {
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
        status_group: "results_finished"
      })
    );
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

    const response = await getMatches(buildQuery({ refresh: true }));

    expect(response.total).toBe(1);
    expect(mockedGetFreshWindow).not.toHaveBeenCalled();
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledTimes(1);
    expect(mockedCreateSyncRun).toHaveBeenCalledTimes(1);
    expect(mockedUpsertMatches).toHaveBeenCalledTimes(1);
    expect(mockedUpsertSuccessWindow).toHaveBeenCalledTimes(1);
    expect(mockedFinishSyncRunSuccess).toHaveBeenCalledTimes(1);
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
    expect(mockedCreateSyncRun).not.toHaveBeenCalled();
    expect(mockedUpsertMatches).not.toHaveBeenCalled();
  });
});
