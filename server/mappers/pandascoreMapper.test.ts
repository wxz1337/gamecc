import { describe, expect, it } from "vitest";
import { mapPandaScoreMatch } from "./pandascoreMapper.js";

describe("pandascoreMapper", () => {
  it("maps missing teams to TBD and normalizes the match payload", () => {
    const mapped = mapPandaScoreMatch(
      {
        id: 12345,
        begin_at: "2026-05-23T16:00:00.000Z",
        status: "canceled",
        end_at: "2026-05-23T18:00:00.000Z",
        number_of_games: 3,
        detailed_stats: true,
        draw: false,
        forfeit: false,
        winner_id: 2,
        results: [{ team_id: 2, score: 1 }],
        games: [{ id: 99, position: 1, status: "finished", length: 1800, winner: { id: 2 } }],
        league: { name: "LPL" },
        serie: { full_name: "LPL 2026 Spring" },
        tournament: { name: "Playoffs", country: "CN", region: "CN", tier: "s", prizepool: "100,000 USD", has_bracket: true },
        streams_list: [{ raw_url: "https://example.com/stream" }]
      },
      "lol"
    );

    expect(mapped).toEqual({
      id: "12345",
      game: "lol",
      name: "",
      league: "LPL",
      leagueImageUrl: null,
      tournament: "LPL 2026 Spring",
      tournamentType: null,
      tournamentCountry: "CN",
      tournamentRegion: "CN",
      tournamentTier: "s",
      tournamentPrizepool: "100,000 USD",
      hasBracket: true,
      beginAt: "2026-05-23T16:00:00.000Z",
      endAt: "2026-05-23T18:00:00.000Z",
      originalScheduledAt: null,
      displayDate: "2026-05-24",
      displayTime: "00:00",
      displayEndTime: "02:00",
      displayOriginalTime: null,
      status: "cancelled",
      bestOf: 3,
      matchType: null,
      rescheduled: null,
      detailedStatsAvailable: true,
      draw: false,
      forfeit: false,
      winnerTeamId: "2",
      winnerName: null,
      score: [{ teamId: "2", score: 1 }],
      games: [{ id: "99", position: 1, status: "finished", lengthSeconds: 1800, winnerTeamId: "2" }],
      teams: [
        { id: null, name: "TBD", acronym: null, imageUrl: null, darkModeImageUrl: null, location: null },
        { id: null, name: "TBD", acronym: null, imageUrl: null, darkModeImageUrl: null, location: null }
      ],
      streamUrl: "https://example.com/stream",
      replayUrl: null,
      serie: "LPL 2026 Spring",
      stage: null,
      source: "pandascore",
      updatedAt: expect.any(String)
    });
  });
});
