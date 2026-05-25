import { afterEach, describe, expect, it } from "vitest";
import type { Match } from "../../shared/match.js";
import { mapMatchToRow, mapRowToMatch } from "./matchRepository.js";

describe("matchRepository", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("maps Match objects to database rows and back", () => {
    const match: Match = {
      id: "match-123",
      game: "lol",
      name: "Team Alpha vs Team Beta",
      league: "LPL",
      leagueImageUrl: "https://example.com/league.png",
      tournament: "LPL Spring",
      tournamentType: "online",
      tournamentCountry: "CN",
      tournamentRegion: "China",
      tournamentTier: "S",
      tournamentPrizepool: "100,000 USD",
      hasBracket: true,
      beginAt: "2026-05-23T16:00:00.000Z",
      endAt: "2026-05-23T18:00:00.000Z",
      originalScheduledAt: "2026-05-23T15:30:00.000Z",
      displayDate: "2026-05-24",
      displayTime: "00:00",
      displayEndTime: "02:00",
      displayOriginalTime: "23:30",
      status: "finished",
      bestOf: 3,
      matchType: "best_of",
      rescheduled: true,
      detailedStatsAvailable: true,
      draw: false,
      forfeit: false,
      winnerTeamId: "team-a",
      winnerName: "Team Alpha",
      score: [
        { teamId: "team-a", score: 2 },
        { teamId: "team-b", score: 1 }
      ],
      games: [
        {
          id: "game-1",
          position: 1,
          status: "finished",
          lengthSeconds: 1800,
          winnerTeamId: "team-a"
        }
      ],
      teams: [
        { id: "team-a", name: "Team Alpha", acronym: "ALP", imageUrl: null, darkModeImageUrl: null, location: "CN" },
        { id: "team-b", name: "Team Beta", acronym: "BET", imageUrl: null, darkModeImageUrl: null, location: "KR" }
      ],
      streamUrl: "https://example.com/stream",
      replayUrl: "https://example.com/replay",
      serie: "LPL Spring 2026",
      stage: "playoffs",
      source: "pandascore",
      updatedAt: "2026-05-23T18:10:00.000Z"
    };

    const row = mapMatchToRow(match);
    const roundTrip = mapRowToMatch({
      id: "row-id",
      source: row.source,
      game: row.game,
      provider_match_id: row.provider_match_id,
      name: row.name,
      begin_at: row.begin_at,
      end_at: row.end_at,
      display_date: row.display_date,
      status: row.status,
      league: row.league,
      league_image_url: row.league_image_url,
      tournament: row.tournament,
      tournament_type: row.tournament_type,
      tournament_country: row.tournament_country,
      tournament_region: row.tournament_region,
      tournament_tier: row.tournament_tier,
      tournament_prizepool: row.tournament_prizepool,
      has_bracket: row.has_bracket,
      best_of: row.best_of,
      match_type: row.match_type,
      rescheduled: row.rescheduled,
      detailed_stats_available: row.detailed_stats_available,
      draw: row.draw,
      forfeit: row.forfeit,
      winner_team_id: row.winner_team_id,
      winner_name: row.winner_name,
      teams: row.teams,
      score: row.score,
      games: row.games,
      stream_url: row.stream_url,
      replay_url: row.replay_url,
      serie: row.serie,
      stage: row.stage,
      raw_payload: row.raw_payload,
      provider_updated_at: row.provider_updated_at,
      created_at: "2026-05-23T18:00:00.000Z",
      updated_at: "2026-05-23T18:10:00.000Z"
    });

    expect(row).toMatchObject({
      source: "pandascore",
      game: "lol",
      provider_match_id: "match-123",
      display_date: "2026-05-24",
      provider_updated_at: "2026-05-23T18:10:00.000Z",
      raw_payload: {
        originalScheduledAt: "2026-05-23T15:30:00.000Z",
        displayTime: "00:00",
        displayEndTime: "02:00",
        displayOriginalTime: "23:30"
      }
    });
    expect(roundTrip).toMatchObject({
      id: "match-123",
      game: "lol",
      displayDate: "2026-05-24",
      displayTime: "00:00",
      displayEndTime: "02:00",
      displayOriginalTime: "23:30",
      originalScheduledAt: "2026-05-23T15:30:00.000Z",
      updatedAt: "2026-05-23T18:10:00.000Z"
    });
  });

  it("derives display times when raw payload is missing", () => {
    const roundTrip = mapRowToMatch({
      id: "row-id",
      source: "pandascore",
      game: "cs2",
      provider_match_id: "match-999",
      name: "Team A vs Team B",
      begin_at: "2026-05-23T12:00:00.000Z",
      end_at: null,
      display_date: "2026-05-23",
      status: "not_started",
      league: "ESL",
      league_image_url: null,
      tournament: "ESL Pro League",
      tournament_type: null,
      tournament_country: null,
      tournament_region: null,
      tournament_tier: null,
      tournament_prizepool: null,
      has_bracket: null,
      best_of: null,
      match_type: null,
      rescheduled: null,
      detailed_stats_available: null,
      draw: null,
      forfeit: null,
      winner_team_id: null,
      winner_name: null,
      teams: [],
      score: [],
      games: [],
      stream_url: null,
      replay_url: null,
      serie: null,
      stage: null,
      raw_payload: null,
      provider_updated_at: null,
      created_at: "2026-05-23T12:00:00.000Z",
      updated_at: "2026-05-23T12:30:00.000Z"
    });

    expect(roundTrip.displayTime).toBe("20:00");
    expect(roundTrip.displayEndTime).toBeNull();
    expect(roundTrip.originalScheduledAt).toBeNull();
    expect(roundTrip.updatedAt).toBe("2026-05-23T12:30:00.000Z");
  });
});

