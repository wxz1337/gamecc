import type { GameType } from "../../shared/match.js";
import type { Database } from "../types/supabase.js";
import { getSupabaseOrThrow } from "./supabaseRepository.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

export type SyncRunRow = Database["public"]["Tables"]["sync_runs"]["Row"];

export type SyncRunRecord = SyncRunRow;

export type CreateSyncRunInput = Pick<SyncRunRow, "source" | "game" | "from_date" | "to_date" | "status_group"> & {
  startedAt?: Date;
};

export type FinishSyncRunSuccessInput = {
  id: string;
  fetchedCount: number;
  upsertedCount: number;
  finishedAt?: Date;
};

export type FinishSyncRunFailureInput = {
  id: string;
  errorCode: string;
  errorMessage: string;
  finishedAt?: Date;
};

const SYNC_RUN_SELECT_COLUMNS =
  "id, source, game, from_date, to_date, status_group, started_at, finished_at, success, fetched_count, upserted_count, error_code, error_message" as const;

function toIso(value: Date | undefined): string {
  return (value ?? new Date()).toISOString();
}

export function buildCreateSyncRunPayload(input: CreateSyncRunInput): Omit<SyncRunRow, "id"> {
  return {
    source: input.source,
    game: input.game,
    from_date: input.from_date,
    to_date: input.to_date,
    status_group: input.status_group,
    started_at: toIso(input.startedAt),
    finished_at: null,
    success: false,
    fetched_count: 0,
    upserted_count: 0,
    error_code: null,
    error_message: null
  };
}

export function buildSuccessSyncRunPatch(input: FinishSyncRunSuccessInput) {
  return {
    finished_at: toIso(input.finishedAt),
    success: true,
    fetched_count: input.fetchedCount,
    upserted_count: input.upsertedCount,
    error_code: null,
    error_message: null
  };
}

export function buildFailureSyncRunPatch(input: FinishSyncRunFailureInput) {
  return {
    finished_at: toIso(input.finishedAt),
    success: false,
    error_code: input.errorCode,
    error_message: input.errorMessage
  };
}

export async function createSyncRun(input: CreateSyncRunInput): Promise<SyncRunRecord> {
  const client = getSupabaseOrThrow();
  const payload = buildCreateSyncRunPayload(input);
  const { data, error } = await client.from("sync_runs").insert(payload).select(SYNC_RUN_SELECT_COLUMNS).single();

  if (error || !data) {
    throw toSupabaseAppError(error, "同步记录创建失败。");
  }

  return data as SyncRunRecord;
}

export async function finishSyncRunSuccess(input: FinishSyncRunSuccessInput): Promise<SyncRunRecord> {
  const client = getSupabaseOrThrow();
  const patch = buildSuccessSyncRunPatch(input);
  const { data, error } = await client.from("sync_runs").update(patch).eq("id", input.id).select(SYNC_RUN_SELECT_COLUMNS).single();

  if (error || !data) {
    throw toSupabaseAppError(error, "同步记录更新失败。");
  }

  return data as SyncRunRecord;
}

export async function finishSyncRunFailure(input: FinishSyncRunFailureInput): Promise<SyncRunRecord> {
  const client = getSupabaseOrThrow();
  const patch = buildFailureSyncRunPatch(input);
  const { data, error } = await client.from("sync_runs").update(patch).eq("id", input.id).select(SYNC_RUN_SELECT_COLUMNS).single();

  if (error || !data) {
    throw toSupabaseAppError(error, "同步记录失败状态更新失败。");
  }

  return data as SyncRunRecord;
}
