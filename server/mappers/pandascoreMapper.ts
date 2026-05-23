import { formatBeijingDateTime } from "../../shared/date.js";
import { GameType, Match, MatchStatus, Team } from "../../shared/match.js";
import { PandaScoreMatch, PandaScoreOpponent, PandaScoreOpponentTeam } from "../types/pandascore.js";

const TBD_TEAM: Team = {
  id: null,
  name: "TBD",
  acronym: null,
  imageUrl: null,
  darkModeImageUrl: null,
  location: null
};

function mapStatus(status: string | null | undefined): MatchStatus {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "running") {
    return "running";
  }

  if (normalizedStatus === "finished") {
    return "finished";
  }

  if (normalizedStatus === "postponed") {
    return "postponed";
  }

  if (normalizedStatus === "canceled" || normalizedStatus === "cancelled") {
    return "cancelled";
  }

  if (normalizedStatus === "postponed" || normalizedStatus === "delayed") {
    return "postponed";
  }

  return "not_started";
}

function mapTeam(team: PandaScoreOpponentTeam | null | undefined): Team | null {
  if (!team) {
    return null;
  }

  return {
    id: team.id == null ? null : String(team.id),
    name: team.name?.trim() || team.acronym?.trim() || "TBD",
    acronym: team.acronym ?? null,
    imageUrl: team.image_url ?? null,
    darkModeImageUrl: team.dark_mode_image_url ?? null,
    location: team.location ?? null
  };
}

function normalizeTeams(opponents: PandaScoreMatch["opponents"]): Team[] {
  const teams =
    opponents
      ?.map((opponent: PandaScoreOpponent) => mapTeam(opponent?.opponent))
      .filter((team): team is Team => team != null) ?? [];

  if (teams.length === 0) {
    return [TBD_TEAM, TBD_TEAM];
  }

  if (teams.length === 1) {
    return [teams[0], TBD_TEAM];
  }

  return teams.slice(0, 2);
}

function safeBeginAt(beginAt: string | null | undefined): string {
  if (!beginAt) {
    return new Date(0).toISOString();
  }

  const parsed = new Date(beginAt);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function safeOptionalIso(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function findWinnerName(teams: Team[], winnerTeamId: string | null): string | null {
  if (!winnerTeamId) {
    return null;
  }

  return teams.find((team) => team.id === winnerTeamId)?.name ?? null;
}

export function mapPandaScoreMatch(rawMatch: PandaScoreMatch, game: GameType): Match {
  const beginAt = safeBeginAt(rawMatch.begin_at);
  const endAt = safeOptionalIso(rawMatch.end_at);
  const originalScheduledAt = safeOptionalIso(rawMatch.original_scheduled_at);
  const display = formatBeijingDateTime(beginAt);
  const teams = normalizeTeams(rawMatch.opponents);
  const winnerTeamId = rawMatch.winner_id == null ? null : String(rawMatch.winner_id);
  const displayEnd = endAt ? formatBeijingDateTime(endAt) : null;
  const displayOriginal = originalScheduledAt ? formatBeijingDateTime(originalScheduledAt) : null;
  const updatedAt = safeOptionalIso(rawMatch.updated_at) ?? new Date().toISOString();

  return {
    id: String(rawMatch.id ?? beginAt),
    game,
    name: rawMatch.name?.trim() || "",
    league: rawMatch.league?.name?.trim() || rawMatch.serie?.name?.trim() || "未知联赛",
    leagueImageUrl: rawMatch.league?.image_url ?? null,
    tournament:
      rawMatch.serie?.full_name?.trim() || rawMatch.tournament?.name?.trim() || rawMatch.name?.trim() || "未知赛事",
    tournamentType: rawMatch.tournament?.type ?? null,
    tournamentCountry: rawMatch.tournament?.country ?? null,
    tournamentRegion: rawMatch.tournament?.region ?? null,
    tournamentTier: rawMatch.tournament?.tier ?? null,
    tournamentPrizepool: rawMatch.tournament?.prizepool ?? null,
    hasBracket: rawMatch.tournament?.has_bracket ?? null,
    beginAt,
    endAt,
    originalScheduledAt,
    displayDate: display.displayDate,
    displayTime: display.displayTime,
    displayEndTime: displayEnd?.displayTime ?? null,
    displayOriginalTime: displayOriginal?.displayTime ?? null,
    status: mapStatus(rawMatch.status),
    bestOf: rawMatch.number_of_games ?? null,
    matchType: rawMatch.match_type ?? null,
    rescheduled: rawMatch.rescheduled ?? null,
    detailedStatsAvailable: rawMatch.detailed_stats ?? rawMatch.tournament?.detailed_stats ?? null,
    draw: rawMatch.draw ?? null,
    forfeit: rawMatch.forfeit ?? null,
    winnerTeamId,
    winnerName: rawMatch.winner?.name?.trim() || findWinnerName(teams, winnerTeamId),
    score:
      rawMatch.results?.map((result) => ({
        teamId: result.team_id == null ? null : String(result.team_id),
        score: result.score ?? 0
      })) ?? [],
    games:
      rawMatch.games?.map((singleGame) => ({
        id: String(singleGame.id ?? `${rawMatch.id ?? beginAt}-${singleGame.position ?? "game"}`),
        position: singleGame.position ?? null,
        status: mapStatus(singleGame.status),
        lengthSeconds: singleGame.length ?? null,
        winnerTeamId: singleGame.winner?.id == null ? null : String(singleGame.winner.id)
      })) ?? [],
    teams,
    streamUrl: rawMatch.streams_list?.[0]?.raw_url ?? null,
    replayUrl: rawMatch.replay_url ?? null,
    serie: rawMatch.serie?.full_name?.trim() || rawMatch.serie?.name?.trim() || null,
    stage: rawMatch.tournament?.type?.trim() || rawMatch.serie?.name?.trim() || null,
    source: "pandascore",
    updatedAt
  };
}
