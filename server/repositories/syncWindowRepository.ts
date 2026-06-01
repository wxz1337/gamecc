import type { GameType } from "../../shared/match.js";
import type { Database } from "../types/supabase.js";
import { getSupabaseOrThrow } from "./supabaseRepository.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

export type SyncWindowRow = Database["public"]["Tables"]["match_fetch_windows"]["Row"];
type SyncWindowUpsert = Database["public"]["Tables"]["match_fetch_windows"]["Insert"];

export type SyncWindowRecord = SyncWindowRow;

export type SyncWindowKey = Pick<SyncWindowRow, "source" | "game" | "from_date" | "to_date" | "status_group">;

export type SyncWindowSuccessInput = SyncWindowKey & {
  ttlSeconds?: number;
  now?: Date;
};

export type SyncWindowFailureInput = SyncWindowKey & {
  errorCode: string;
  errorMessage: string;
  retryAfterSeconds?: number;
  now?: Date;
};

const DEFAULT_WINDOW_TTL_SECONDS = 900;
const DEFAULT_FAILURE_RETRY_SECONDS = 60;
const SYNC_WINDOW_SELECT_COLUMNS =
  "id, source, game, from_date, to_date, status_group, last_synced_at, expires_at, last_error_code, last_error_message, created_at, updated_at" as const;

function normalizeSeconds(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.trunc(value);
}

function buildWindowExpiresAt(now: Date, ttlSeconds: number): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

function toIso(value: Date | undefined): string {
  return (value ?? new Date()).toISOString();
}

export function isSyncWindowFresh(row: SyncWindowRow, now = new Date()): boolean {
  if (!row.expires_at) {
    return false;
  }

  return new Date(row.expires_at).getTime() > now.getTime();
}

export function buildSuccessWindowPayload(input: SyncWindowSuccessInput): SyncWindowUpsert {
  const now = input.now ?? new Date();
  const ttlSeconds = normalizeSeconds(input.ttlSeconds, DEFAULT_WINDOW_TTL_SECONDS);

  return {
    source: input.source,
    game: input.game,
    from_date: input.from_date,
    to_date: input.to_date,
    status_group: input.status_group,
    last_synced_at: toIso(now),
    expires_at: buildWindowExpiresAt(now, ttlSeconds),
    last_error_code: null,
    last_error_message: null
  };
}

export function buildFailureWindowPayload(input: SyncWindowFailureInput): SyncWindowUpsert {
  const now = input.now ?? new Date();
  const retryAfterSeconds = normalizeSeconds(input.retryAfterSeconds, DEFAULT_FAILURE_RETRY_SECONDS);

  return {
    source: input.source,
    game: input.game,
    from_date: input.from_date,
    to_date: input.to_date,
    status_group: input.status_group,
    expires_at: buildWindowExpiresAt(now, retryAfterSeconds),
    last_error_code: input.errorCode,
    last_error_message: input.errorMessage
  };
}

export async function getFreshWindow(key: SyncWindowKey, now = new Date()): Promise<SyncWindowRecord | null> {
  const client = getSupabaseOrThrow();
  const { data, error } = await client
    .from("match_fetch_windows")
    .select(SYNC_WINDOW_SELECT_COLUMNS)
    .eq("source", key.source)
    .eq("game", key.game)
    .eq("from_date", key.from_date)
    .eq("to_date", key.to_date)
    .eq("status_group", key.status_group)
    .maybeSingle();

  if (error) {
    throw toSupabaseAppError(error, "赛程窗口查询失败。");
  }

  if (!data || !isSyncWindowFresh(data as SyncWindowRow, now)) {
    return null;
  }

  return data as SyncWindowRow;
}

export async function getSuccessfulWindow(key: SyncWindowKey): Promise<SyncWindowRecord | null> {
  const client = getSupabaseOrThrow();
  const { data, error } = await client
    .from("match_fetch_windows")
    .select(SYNC_WINDOW_SELECT_COLUMNS)
    .eq("source", key.source)
    .eq("game", key.game)
    .eq("from_date", key.from_date)
    .eq("to_date", key.to_date)
    .eq("status_group", key.status_group)
    .not("last_synced_at", "is", null)
    .maybeSingle();

  if (error) {
    throw toSupabaseAppError(error, "赛程窗口查询失败。");
  }

  if (!data) {
    return null;
  }

  return data as SyncWindowRow;
}

export type SyncWindowCoverageQuery = Pick<SyncWindowKey, "source" | "game" | "from_date" | "to_date"> & {
  status_groups: string[];
};

export async function getSuccessfulWindowsForCoverage(
  input: SyncWindowCoverageQuery
): Promise<SyncWindowRecord[]> {
  if (input.status_groups.length === 0) {
    return [];
  }

  const client = getSupabaseOrThrow();
  const { data, error } = await client
    .from("match_fetch_windows")
    .select(SYNC_WINDOW_SELECT_COLUMNS)
    .eq("source", input.source)
    .eq("game", input.game)
    .in("status_group", input.status_groups)
    .not("last_synced_at", "is", null)
    .lte("from_date", input.to_date)
    .gte("to_date", input.from_date)
    .order("from_date", { ascending: true })
    .order("to_date", { ascending: true });

  if (error) {
    throw toSupabaseAppError(error, "赛程窗口查询失败。");
  }

  return (data ?? []) as SyncWindowRow[];
}

export async function upsertSuccessWindow(input: SyncWindowSuccessInput): Promise<SyncWindowRecord> {
  const client = getSupabaseOrThrow();
  const payload = buildSuccessWindowPayload(input);
  const { data, error } = await client
    .from("match_fetch_windows")
    .upsert(payload, {
      onConflict: "source,game,from_date,to_date,status_group"
    })
    .select(SYNC_WINDOW_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw toSupabaseAppError(error, "赛程窗口写入失败。");
  }

  return data as SyncWindowRecord;
}

export async function upsertFailedWindow(input: SyncWindowFailureInput): Promise<SyncWindowRecord> {
  const client = getSupabaseOrThrow();
  const payload = buildFailureWindowPayload(input);
  const { data, error } = await client
    .from("match_fetch_windows")
    .upsert(payload, {
      onConflict: "source,game,from_date,to_date,status_group"
    })
    .select(SYNC_WINDOW_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw toSupabaseAppError(error, "赛程窗口失败状态写入失败。");
  }

  return data as SyncWindowRecord;
}
