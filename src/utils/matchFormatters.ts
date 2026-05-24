import { BEIJING_TIME_ZONE } from "../../shared/date";
import type { GameFilter, Match } from "../../shared/match";

export function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "更新时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatTeams(match: Match): string {
  return match.teams
    .map((team) => team.name.trim())
    .filter(Boolean)
    .join(" vs ");
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
}

export function getTeamScore(match: Match, teamId: string | null | undefined): number | null {
  if (!teamId || !match.score) {
    return null;
  }

  return match.score.find((score) => score.teamId === teamId)?.score ?? null;
}

export function getWinnerLabel(match: Match): string | null {
  if (match.draw) {
    return "平局";
  }

  return match.winnerName ?? null;
}

export function formatTournamentMeta(match: Match): string[] {
  return [
    match.tournamentCountry,
    match.tournamentRegion && match.tournamentRegion !== match.tournamentCountry ? match.tournamentRegion : null,
    match.tournamentTier ? `${match.tournamentTier.toUpperCase()} 级` : null,
    match.hasBracket ? "淘汰赛签表" : null,
    match.tournamentPrizepool ? `奖金 ${match.tournamentPrizepool}` : null
  ].filter((item): item is string => Boolean(item));
}

export function getEmptyStateMessage(filters: {
  game: GameFilter;
  query?: string;
  league?: string;
  team?: string;
  region?: string;
  stage?: string;
  tier?: string;
}): string {
  if (filters.query || filters.league || filters.team || filters.region || filters.stage || (filters.tier && filters.tier !== "all" && filters.tier !== "S,A")) {
    return "当前筛选条件下没有匹配的比赛，请尝试放宽赛事级别、赛区或状态筛选。";
  }

  return filters.game === "all" ? "当天暂无已收录比赛。" : "当前筛选游戏在当天没有比赛。";
}
