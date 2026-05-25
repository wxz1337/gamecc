import type { MatchQuery } from "../../shared/match.js";

type CacheEntry<T> = {
  value: T;
  createdAt: number;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_SECONDS = 900;
const MIN_TTL_SECONDS = 600;
const MAX_TTL_SECONDS = 1800;

function getCacheTtlSeconds(): number {
  const rawValue = Number(process.env.CACHE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, rawValue));
}

function normalizeKeyPart(value: string | undefined): string {
  return value?.trim().toLowerCase() || "all";
}

export function buildResponseCacheKey(query: MatchQuery): string {
  return [
    "matches-response:v3",
    query.from,
    query.to,
    query.view,
    query.game,
    query.status,
    query.tier,
    normalizeKeyPart(query.region),
    query.sort,
    normalizeKeyPart(query.query),
    normalizeKeyPart(query.league),
    normalizeKeyPart(query.team),
    normalizeKeyPart(query.stage)
  ].join(":");
}

export function buildSourceWindowCacheKey(
  query: Pick<MatchQuery, "from" | "to" | "game"> & {
    statusGroup: string;
  }
): string {
  return [
    "source-window:v1",
    query.game,
    query.from,
    query.to,
    normalizeKeyPart(query.statusGroup)
  ].join(":");
}

export function buildCacheKey(query: MatchQuery | string, game?: string): string {
  if (typeof query === "string") {
    return `matches:${query}:${game ?? "all"}`;
  }

  return [
    "matches:v2",
    query.from,
    query.to,
    query.view,
    query.game,
    query.status,
    query.tier,
    normalizeKeyPart(query.query),
    normalizeKeyPart(query.league),
    normalizeKeyPart(query.team),
    normalizeKeyPart(query.region),
    normalizeKeyPart(query.stage),
    query.sort
  ].join(":");
}

export function getFresh<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value as T;
}

export function getAny<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlSeconds = getCacheTtlSeconds()): void {
  const now = Date.now();
  const ttlMilliseconds = ttlSeconds * 1000;

  cacheStore.set(key, {
    value,
    createdAt: now,
    expiresAt: now + ttlMilliseconds
  });
}
