import { formatBeijingDateTime } from "../../shared/date.js";
import type { GameFilter, GameType, Match, MatchGame, MatchScore, Team } from "../../shared/match.js";
import type { Database, Json } from "../types/supabase.js";
import { getSupabaseOrThrow } from "./supabaseRepository.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
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

export const MATCH_UPSERT_CHUNK_SIZE = 100;

const MATCH_SELECT_COLUMNS =
  "id, source, game, provider_match_id, name, begin_at, end_at, display_date, status, league, league_image_url, tournament, tournament_type, tournament_country, tournament_region, tournament_tier, tournament_prizepool, has_bracket, best_of, match_type, rescheduled, detailed_stats_available, draw, forfeit, winner_team_id, winner_name, teams, score, games, stream_url, replay_url, serie, stage, raw_payload, provider_updated_at, created_at, updated_at" as const;

function asArray<T>(value: Json | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: Json | null | undefined): Record<string, Json> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, Json>;
  }

  return {};
}

function buildMatchRawPayload(match: Match): Record<string, Json> {
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
    teams: match.teams as Json,
    score: (match.score ?? []) as Json,
    games: (match.games ?? []) as Json,
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

export function chunkMatchRows(rows: MatchRowUpsert[], chunkSize = MATCH_UPSERT_CHUNK_SIZE): MatchRowUpsert[][] {
  const normalizedChunkSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.trunc(chunkSize) : MATCH_UPSERT_CHUNK_SIZE;
  const chunks: MatchRowUpsert[][] = [];

  for (let index = 0; index < rows.length; index += normalizedChunkSize) {
    chunks.push(rows.slice(index, index + normalizedChunkSize));
  }

  return chunks;
}

export async function upsertMatches(matches: Match[]): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  const client = getSupabaseOrThrow();
  const rows = matches.map(mapMatchToRow);

  for (const chunk of chunkMatchRows(rows)) {
    const { error } = await client.from("matches").upsert(chunk, {
      onConflict: "source,game,provider_match_id"
    });

    if (error) {
      throw toSupabaseAppError(error, "赛程持久化写入失败。");
    }
  }
}

export async function queryMatchesByDateRange(options: QueryMatchesOptions): Promise<Match[]> {
  const client = getSupabaseOrThrow();
  let query = client
    .from("matches")
    .select(MATCH_SELECT_COLUMNS)
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
