import { AppError, ERROR_CODES } from "../../shared/errors.js";
import type { GameType } from "../../shared/match.js";
import { getSupabaseClient } from "../services/supabaseClient.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SyncWindowRow = {
  id: string;
  source: string;
  game: GameType;
  from_date: string;
  to_date: string;
  status_group: string;
  last_synced_at: string | null;
  expires_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
};

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

function getSupabaseOrThrow() {
  const client = getSupabaseClient();

  if (!client) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Supabase 未配置，无法访问持久化缓存。", 500);
  }

  return client;
}

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

export function buildSuccessWindowPayload(input: SyncWindowSuccessInput): Omit<SyncWindowRow, "id" | "created_at" | "updated_at"> {
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

export function buildFailureWindowPayload(input: SyncWindowFailureInput): Partial<Omit<SyncWindowRow, "id" | "created_at" | "updated_at">> {
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
    .select("*")
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

export async function upsertSuccessWindow(input: SyncWindowSuccessInput): Promise<SyncWindowRecord> {
  const client = getSupabaseOrThrow();
  const payload = buildSuccessWindowPayload(input);
  const { data, error } = await client
    .from("match_fetch_windows")
    .upsert(payload, {
      onConflict: "source,game,from_date,to_date,status_group"
    })
    .select("*")
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
    .select("*")
    .single();

  if (error || !data) {
    throw toSupabaseAppError(error, "赛程窗口失败状态写入失败。");
  }

  return data as SyncWindowRecord;
}
