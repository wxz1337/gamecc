import { AppError, ERROR_CODES } from "../../shared/errors.js";
import { getSupabaseClient, type SupabaseServerClient } from "../services/supabaseClient.js";

export function getSupabaseOrThrow(): SupabaseServerClient {
  const client = getSupabaseClient();

  if (!client) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Supabase 未配置，无法访问持久化缓存。", 500);
  }

  return client;
}
