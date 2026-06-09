import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Team } from "../../shared/match.js";
import { updateTeamCachedIcon, type TeamRow } from "../repositories/teamRepository.js";

export const TEAM_ICONS_DIR = resolve(process.cwd(), "cache", "team-icons");
const ICON_DOWNLOAD_TIMEOUT_MS = 8_000;
const ICON_DOWNLOAD_CONCURRENCY = 3;
const MAX_ICON_BYTES = 2 * 1024 * 1024;

function ensureIconsDir(): void {
  if (!existsSync(TEAM_ICONS_DIR)) {
    mkdirSync(TEAM_ICONS_DIR, { recursive: true });
  }
}

function getCachedUrl(fileName: string): string {
  return `/api/team-icons/${fileName}`;
}

function getFileName(teamId: string, kind: "image" | "darkImage"): string {
  const suffix = kind === "darkImage" ? "_dark" : "";
  return `${sanitizeFileName(teamId)}${suffix}.png`;
}

function sanitizeFileName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function downloadIcon(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ICON_DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? null;
    if (contentType && !contentType.startsWith("image/")) {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_ICON_BYTES) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_ICON_BYTES) {
      return null;
    }

    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function saveIcon(fileName: string, data: Buffer): string {
  ensureIconsDir();
  const filePath = resolve(TEAM_ICONS_DIR, fileName);
  writeFileSync(filePath, data);
  return getCachedUrl(fileName);
}

async function cacheTeamIcon(
  teamId: string,
  kind: "image" | "darkImage",
  url: string
): Promise<string | null> {
  const data = await downloadIcon(url);

  if (!data) {
    console.warn(`Team icon download failed: ${teamId} (${kind})`);
    return null;
  }

  const fileName = getFileName(teamId, kind);
  const cachedUrl = saveIcon(fileName, data);

  try {
    await updateTeamCachedIcon(teamId, kind, cachedUrl);
  } catch (error) {
    console.warn(`Team icon DB cache update failed: ${teamId} (${kind})`, error);
  }

  return cachedUrl;
}

export async function downloadAndCacheTeamIcons(teamRow: TeamRow): Promise<void> {
  if (teamRow.image_url && !teamRow.cached_image_url) {
    await cacheTeamIcon(teamRow.id, "image", teamRow.image_url);
  }

  if (teamRow.dark_image_url && !teamRow.cached_dark_image_url) {
    await cacheTeamIcon(teamRow.id, "darkImage", teamRow.dark_image_url);
  }
}

export async function downloadTeamsConcurrently(teams: TeamRow[]): Promise<void> {
  const uncached = teams.filter(
    (t) =>
      (t.image_url && !t.cached_image_url) ||
      (t.dark_image_url && !t.cached_dark_image_url)
  );

  if (uncached.length === 0) {
    return;
  }

  for (let i = 0; i < uncached.length; i += ICON_DOWNLOAD_CONCURRENCY) {
    const batch = uncached.slice(i, i + ICON_DOWNLOAD_CONCURRENCY);
    await Promise.allSettled(batch.map((team) => downloadAndCacheTeamIcons(team)));
  }
}

export function enrichTeamIcons(team: Team, teamRow: TeamRow | undefined): Team {
  if (!teamRow) {
    return team;
  }

  return {
    ...team,
    imageUrl: teamRow.cached_image_url || teamRow.image_url || team.imageUrl,
    darkModeImageUrl: teamRow.cached_dark_image_url || teamRow.dark_image_url || team.darkModeImageUrl
  };
}
