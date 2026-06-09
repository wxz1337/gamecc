import type { Team } from "../../shared/match.js";
import type { Database } from "../types/supabase.js";
import { getSupabaseOrThrow } from "./supabaseRepository.js";
import { toSupabaseAppError } from "./supabaseErrors.js";

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type TeamRowUpsert = Database["public"]["Tables"]["teams"]["Insert"];

const TEAM_UPSERT_CHUNK_SIZE = 100;

export function chunkTeamRows(rows: TeamRowUpsert[], chunkSize = TEAM_UPSERT_CHUNK_SIZE): TeamRowUpsert[][] {
  const normalizedChunkSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.trunc(chunkSize) : TEAM_UPSERT_CHUNK_SIZE;
  const chunks: TeamRowUpsert[][] = [];

  for (let index = 0; index < rows.length; index += normalizedChunkSize) {
    chunks.push(rows.slice(index, index + normalizedChunkSize));
  }

  return chunks;
}

export function teamToRow(team: Pick<Team, "id" | "name" | "acronym" | "imageUrl" | "darkModeImageUrl">): TeamRowUpsert {
  const now = new Date().toISOString();

  return {
    id: team.id ?? team.name,
    name: team.name,
    acronym: team.acronym ?? null,
    image_url: team.imageUrl ?? null,
    dark_image_url: team.darkModeImageUrl ?? null,
    last_seen_at: now,
    updated_at: now
  };
}

export async function upsertTeams(teams: TeamRowUpsert[]): Promise<void> {
  if (teams.length === 0) {
    return;
  }

  const client = getSupabaseOrThrow();

  for (const chunk of chunkTeamRows(teams)) {
    const { error } = await client.from("teams").upsert(chunk, {
      onConflict: "id",
      ignoreDuplicates: false
    });

    if (error) {
      throw toSupabaseAppError(error, "战队数据持久化写入失败。");
    }
  }
}

export async function updateTeamCachedIcon(
  teamId: string,
  kind: "image" | "darkImage",
  cachedUrl: string
): Promise<void> {
  const client = getSupabaseOrThrow();
  const payload: Database["public"]["Tables"]["teams"]["Update"] = {
    updated_at: new Date().toISOString()
  };

  if (kind === "image") {
    payload.cached_image_url = cachedUrl;
  } else {
    payload.cached_dark_image_url = cachedUrl;
  }

  const { error } = await client
    .from("teams")
    .update(payload)
    .eq("id", teamId);

  if (error) {
    throw toSupabaseAppError(error, "战队图标缓存更新失败。");
  }
}

export async function queryTeamsByIds(teamIds: string[]): Promise<TeamRow[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("teams")
    .select("id, name, acronym, image_url, dark_image_url, cached_image_url, cached_dark_image_url, last_seen_at")
    .in("id", teamIds);

  if (error) {
    throw toSupabaseAppError(error, "战队数据查询失败。");
  }

  return (data ?? []) as TeamRow[];
}

export async function queryTeamsWithoutCache(): Promise<TeamRow[]> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("teams")
    .select("id, name, acronym, image_url, dark_image_url, cached_image_url, cached_dark_image_url, last_seen_at")
    .or("image_url.not.is.null,dark_image_url.not.is.null")
    .or("cached_image_url.is.null,cached_dark_image_url.is.null");

  if (error) {
    throw toSupabaseAppError(error, "未缓存图标战队查询失败。");
  }

  return (data ?? []) as TeamRow[];
}

export function enrichTeamWithCache(team: Team, teamRow: TeamRow | undefined): Team {
  if (!teamRow) {
    return team;
  }

  return {
    ...team,
    imageUrl: teamRow.cached_image_url || teamRow.image_url || team.imageUrl,
    darkModeImageUrl: teamRow.cached_dark_image_url || teamRow.dark_image_url || team.darkModeImageUrl
  };
}
