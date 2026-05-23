import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchQuery } from "../../shared/match.js";
import { PandaScoreMatch } from "../types/pandascore.js";
import { getMatches } from "./matchService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";

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
      tier: "S",
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
      })
    );
  });
});
