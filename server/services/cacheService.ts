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

export function buildCacheKey(date: string, game: string): string {
  return `matches:${date}:${game}`;
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
