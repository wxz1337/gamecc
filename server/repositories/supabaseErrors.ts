import { AppError, ERROR_CODES } from "../../shared/errors.js";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const SUPABASE_SCHEMA_ERROR_CODES = new Set(["42P01", "PGRST205"]);

function getErrorText(error: SupabaseErrorLike): string {
  return [error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

export function isSupabaseSchemaNotReadyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as SupabaseErrorLike;

  if (supabaseError.code && SUPABASE_SCHEMA_ERROR_CODES.has(supabaseError.code)) {
    return true;
  }

  const text = getErrorText(supabaseError);

  return text.includes("relation") && text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find the table");
}

export function toSupabaseAppError(error: unknown, fallbackMessage: string): AppError {
  if (isSupabaseSchemaNotReadyError(error)) {
    return new AppError(ERROR_CODES.SUPABASE_SCHEMA_NOT_READY, "Supabase 表结构尚未部署。", 500);
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, fallbackMessage, 500);
}
