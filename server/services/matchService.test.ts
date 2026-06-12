import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ERROR_CODES } from "../../shared/errors.js";
import { MatchQuery } from "../../shared/match.js";
import { PandaScoreMatch } from "../types/pandascore.js";
import { areWindowsCoveringDateRange, getMatches, getMissingDateRanges } from "./matchService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";
import { clearCache } from "./cacheService.js";

vi.mock("./pandascoreClient.js", () => ({
  fetchPandaScoreMatches: vi.fn()
}));

const mockedFetchPandaScoreMatches = vi.mocked(fetchPandaScoreMatches);

function buildQuery(overrides: Partial<MatchQuery> = {}): MatchQuery {
  return {
    from: "2026-05-01",
    to: "2026-05-07",
    view: "results",
    game: "lol",
    status: "finished",
    tier: "S,A",
    sort: "beginAt_desc",
    refresh: true,
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

describe("matchService", () => {
  beforeEach(() => {
    mockedFetchPandaScoreMatches.mockReset();
    clearCache();
  });

  it("detects continuous historical coverage across fragmented windows", () => {
    expect(
      areWindowsCoveringDateRange(
        [
          { from_date: "2026-05-04", to_date: "2026-05-10" },
          { from_date: "2026-05-11", to_date: "2026-05-17" },
          { from_date: "2026-05-18", to_date: "2026-05-24" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toBe(true);

    expect(
      areWindowsCoveringDateRange(
        [
          { from_date: "2026-05-05", to_date: "2026-05-10" },
          { from_date: "2026-05-11", to_date: "2026-05-18" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toBe(false);

    expect(
      areWindowsCoveringDateRange(
        [
          { from_date: "2026-05-04", to_date: "2026-05-10" },
          { from_date: "2026-05-10", to_date: "2026-05-18" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toBe(true);
  });

  it("lists only the missing historical finished date ranges", () => {
    expect(
      getMissingDateRanges(
        [
          { from_date: "2026-05-05", to_date: "2026-05-10" },
          { from_date: "2026-05-11", to_date: "2026-05-17" },
          { from_date: "2026-05-18", to_date: "2026-05-24" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toEqual([{ fromDate: "2026-05-04", toDate: "2026-05-04" }]);

    expect(
      getMissingDateRanges(
        [
          { from_date: "2026-05-04", to_date: "2026-05-10" },
          { from_date: "2026-05-12", to_date: "2026-05-18" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toEqual([{ fromDate: "2026-05-11", toDate: "2026-05-11" }]);

    expect(
      getMissingDateRanges(
        [
          { from_date: "2026-05-04", to_date: "2026-05-10" },
          { from_date: "2026-05-14", to_date: "2026-05-18" }
        ],
        "2026-05-04",
        "2026-05-18"
      )
    ).toEqual([{ fromDate: "2026-05-11", toDate: "2026-05-13" }]);

    expect(getMissingDateRanges([], "2026-05-04", "2026-05-18")).toEqual([
      { fromDate: "2026-05-04", toDate: "2026-05-18" }
    ]);
  });

  it("filters, sorts and builds facets for 0.2.0 queries", async () => {
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 1,
        begin_at: "2026-05-02T12:00:00.000Z",
        name: "Bilibili Gaming vs Top Esports",
        teamA: "Bilibili Gaming",
        teamB: "Top Esports",
        league: "LPL"
      }),
      buildRawMatch({
        id: 2,
        begin_at: "2026-05-04T12:00:00.000Z",
        name: "Gen.G vs T1",
        teamA: "Gen.G",
        teamB: "T1",
        league: "LCK",
        country: "KR",
        region: "Korea"
      }),
      buildRawMatch({
        id: 3,
        begin_at: "2026-05-06T12:00:00.000Z",
        status: "not_started",
        name: "Future Match"
      })
    ]);

    const response = await getMatches(buildQuery({ query: "lpl", team: "bilibili" }));

    expect(response.total).toBe(1);
    expect(response.matches[0]).toMatchObject({
      id: "1",
      league: "LPL",
      status: "finished"
    });
    expect(response.facets.leagues.map((item) => item.value)).toContain("LCK");
    expect(response.facets.statuses.map((item) => item.value)).toContain("not_started");
    expect(mockedFetchPandaScoreMatches).toHaveBeenCalledWith(
      "lol",
      expect.objectContaining({
        startUtc: expect.any(Date),
        endUtc: expect.any(Date)
      }),
      expect.objectContaining({
        statuses: ["finished"]
      })
    );
  });

  it("filters matches by tournament tier", async () => {
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 1,
        begin_at: "2026-05-02T12:00:00.000Z",
        tier: "S",
        name: "Top Tier Match"
      }),
      buildRawMatch({
        id: 2,
        begin_at: "2026-05-03T12:00:00.000Z",
        tier: "A",
        name: "Second Tier Match"
      })
    ]);

    const response = await getMatches(buildQuery({ status: "all", tier: "S,A" }));

    expect(response.matches.map((match) => match.tournamentTier).sort()).toEqual(["A", "S"]);
  });

  it("keeps schedule queries on running status broad enough for not started matches", async () => {
    mockedFetchPandaScoreMatches.mockResolvedValue([
      buildRawMatch({
        id: 1,
        begin_at: "2026-05-02T12:00:00.000Z",
        status: "running",
        name: "Live Match"
      }),
      buildRawMatch({
        id: 2,
        begin_at: "2026-05-03T12:00:00.000Z",
        status: "not_started",
        name: "Upcoming Match"
      }),
      buildRawMatch({
        id: 3,
        begin_at: "2026-05-04T12:00:00.000Z",
        status: "finished",
        name: "Finished Match"
      })
    ]);

    const response = await getMatches(buildQuery({ view: "schedule", status: "running", sort: "beginAt_asc" }));

    expect(response.total).toBe(2);
    expect(response.matches.map((match) => match.status).sort()).toEqual(["not_started", "running"]);
  });

  it("invalidates all-game responses when a single game receives a newer status", async () => {
    let lolFetchCount = 0;

    mockedFetchPandaScoreMatches.mockImplementation(async (game) => {
      if (game === "lol") {
        lolFetchCount += 1;

        return [
          buildRawMatch({
            id: 101,
            status: lolFetchCount === 1 ? "not_started" : "running",
            name: "Updated LoL Match"
          })
        ];
      }

      return [
        buildRawMatch({
          id: game === "cs2" ? 201 : 301,
          status: "not_started",
          name: `${game} Match`
        })
      ];
    });

    const allGamesQuery = buildQuery({
      from: "2026-07-01",
      to: "2026-07-07",
      view: "schedule",
      game: "all",
      status: "running",
      tier: "all",
      sort: "beginAt_asc",
      refresh: false
    });

    const initialResponse = await getMatches(allGamesQuery);
    expect(initialResponse.matches.find((match) => match.game === "lol")?.status).toBe("not_started");

    await getMatches({ ...allGamesQuery, game: "lol", refresh: true });
    const updatedResponse = await getMatches(allGamesQuery);

    expect(lolFetchCount).toBe(3);
    expect(updatedResponse.matches.find((match) => match.game === "lol")?.status).toBe("running");
  });

  it("returns available games when one source fails for all-game queries", async () => {
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

  it("keeps single-game queries strict when the selected source fails", async () => {
    mockedFetchPandaScoreMatches.mockRejectedValue(
      new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504)
    );

    await expect(getMatches(buildQuery({ game: "lol" }))).rejects.toMatchObject({
      code: ERROR_CODES.PANDASCORE_TIMEOUT
    });
  });
});
