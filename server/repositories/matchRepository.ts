import { formatBeijingDateTime } from "../../shared/date.js";
import { AppError, ERROR_CODES } from "../../shared/errors.js";
import type { GameFilter, GameType, Match, MatchGame, MatchScore, Team } from "../../shared/match.js";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabaseClient.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type MatchRow = {
  id: string;
  source: string;
  game: GameType;
  provider_match_id: string;
  name: string;
  begin_at: string;
  end_at: string | null;
  display_date: string;
  status: Match["status"];
  league: string | null;
  league_image_url: string | null;
  tournament: string | null;
  tournament_type: string | null;
  tournament_country: string | null;
  tournament_region: string | null;
  tournament_tier: string | null;
  tournament_prizepool: string | null;
  has_bracket: boolean | null;
  best_of: number | null;
  match_type: string | null;
  rescheduled: boolean | null;
  detailed_stats_available: boolean | null;
  draw: boolean | null;
  forfeit: boolean | null;
  winner_team_id: string | null;
  winner_name: string | null;
  teams: JsonValue;
  score: JsonValue;
  games: JsonValue;
  stream_url: string | null;
  replay_url: string | null;
  serie: string | null;
  stage: string | null;
  raw_payload: JsonValue | null;
  provider_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchRowUpsert = Omit<MatchRow, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type QueryMatchesOptions = {
  source?: string;
  game?: GameFilter;
  fromDate: string;
  toDate: string;
  statuses?: Match["status"][];
};

function asArray<T>(value: JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: JsonValue | null | undefined): Record<string, JsonValue> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, JsonValue>;
  }

  return {};
}

function buildMatchRawPayload(match: Match): Record<string, JsonValue> {
  return {
    originalScheduledAt: match.originalScheduledAt ?? null,
    displayTime: match.displayTime,
    displayEndTime: match.displayEndTime ?? null,
    displayOriginalTime: match.displayOriginalTime ?? null
  };
}

export function mapMatchToRow(match: Match): MatchRowUpsert {
  return {
    source: match.source,
    game: match.game,
    provider_match_id: match.id,
    name: match.name,
    begin_at: match.beginAt,
    end_at: match.endAt ?? null,
    display_date: match.displayDate,
    status: match.status,
    league: match.league,
    league_image_url: match.leagueImageUrl ?? null,
    tournament: match.tournament,
    tournament_type: match.tournamentType ?? null,
    tournament_country: match.tournamentCountry ?? null,
    tournament_region: match.tournamentRegion ?? null,
    tournament_tier: match.tournamentTier ?? null,
    tournament_prizepool: match.tournamentPrizepool ?? null,
    has_bracket: match.hasBracket ?? null,
    best_of: match.bestOf ?? null,
    match_type: match.matchType ?? null,
    rescheduled: match.rescheduled ?? null,
    detailed_stats_available: match.detailedStatsAvailable ?? null,
    draw: match.draw ?? null,
    forfeit: match.forfeit ?? null,
    winner_team_id: match.winnerTeamId ?? null,
    winner_name: match.winnerName ?? null,
    teams: match.teams as JsonValue,
    score: (match.score ?? []) as JsonValue,
    games: (match.games ?? []) as JsonValue,
    stream_url: match.streamUrl ?? null,
    replay_url: match.replayUrl ?? null,
    serie: match.serie ?? null,
    stage: match.stage ?? null,
    raw_payload: buildMatchRawPayload(match),
    provider_updated_at: match.updatedAt,
    updated_at: new Date().toISOString()
  };
}

export function mapRowToMatch(row: MatchRow): Match {
  const rawPayload = asRecord(row.raw_payload);
  const originalScheduledAt = typeof rawPayload.originalScheduledAt === "string" ? rawPayload.originalScheduledAt : null;
  const displayTime =
    typeof rawPayload.displayTime === "string" ? rawPayload.displayTime : formatBeijingDateTime(row.begin_at).displayTime;
  const displayEndTime =
    typeof rawPayload.displayEndTime === "string"
      ? rawPayload.displayEndTime
      : row.end_at
        ? formatBeijingDateTime(row.end_at).displayTime
        : null;
  const displayOriginalTime =
    typeof rawPayload.displayOriginalTime === "string"
      ? rawPayload.displayOriginalTime
      : originalScheduledAt
        ? formatBeijingDateTime(originalScheduledAt).displayTime
        : null;

  return {
    id: row.provider_match_id,
    game: row.game,
    name: row.name,
    league: row.league ?? "",
    leagueImageUrl: row.league_image_url,
    tournament: row.tournament ?? "",
    tournamentType: row.tournament_type,
    tournamentCountry: row.tournament_country,
    tournamentRegion: row.tournament_region,
    tournamentTier: row.tournament_tier,
    tournamentPrizepool: row.tournament_prizepool,
    hasBracket: row.has_bracket,
    beginAt: row.begin_at,
    endAt: row.end_at,
    originalScheduledAt,
    displayDate: row.display_date,
    displayTime,
    displayEndTime,
    displayOriginalTime,
    status: row.status,
    bestOf: row.best_of,
    matchType: row.match_type,
    rescheduled: row.rescheduled,
    detailedStatsAvailable: row.detailed_stats_available,
    draw: row.draw,
    forfeit: row.forfeit,
    winnerTeamId: row.winner_team_id,
    winnerName: row.winner_name,
    score: asArray<MatchScore>(row.score),
    games: asArray<MatchGame>(row.games),
    teams: asArray<Team>(row.teams),
    streamUrl: row.stream_url,
    replayUrl: row.replay_url,
    serie: row.serie,
    stage: row.stage,
    source: "pandascore",
    updatedAt: row.provider_updated_at ?? row.updated_at
  };
}

function getSupabaseOrThrow() {
  const client = getSupabaseClient();

  if (!client) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Supabase 未配置，无法访问持久化缓存。", 500);
  }

  return client;
}

export async function upsertMatches(matches: Match[]): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  const client = getSupabaseOrThrow();
  const rows = matches.map(mapMatchToRow);
  const { error } = await client.from("matches").upsert(rows, {
    onConflict: "source,game,provider_match_id"
  });

  if (error) {
    throw toSupabaseAppError(error, "赛程持久化写入失败。");
  }
}

export async function queryMatchesByDateRange(options: QueryMatchesOptions): Promise<Match[]> {
  const client = getSupabaseOrThrow();
  let query = client
    .from("matches")
    .select("*")
    .eq("source", options.source ?? "pandascore")
    .gte("display_date", options.fromDate)
    .lte("display_date", options.toDate)
    .order("begin_at", { ascending: true });

  if (options.game && options.game !== "all") {
    query = query.eq("game", options.game);
  }

  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw toSupabaseAppError(error, "赛程持久化查询失败。");
  }

  return (data ?? []).map((row) => mapRowToMatch(row as MatchRow));
}
