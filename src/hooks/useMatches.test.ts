import { describe, expect, it } from "vitest";
import type { MatchPageState } from "../utils/matchPageState";
import { invalidateRelatedDisplayCacheEntries } from "./useMatches";

function buildFilters(overrides: Partial<MatchPageState> = {}): MatchPageState {
  return {
    view: "schedule",
    from: "2026-06-10",
    to: "2026-06-16",
    game: "all",
    status: "running",
    tier: "S,A",
    query: "",
    league: "",
    team: "",
    region: "",
    stage: "",
    sort: "beginAt_asc",
    ...overrides
  };
}

function buildKey(filters: MatchPageState): string {
  const { to: _to, ...keyParts } = filters;
  return JSON.stringify(keyParts);
}

describe("useMatches display cache", () => {
  it("invalidates other game scopes after receiving a newer response", () => {
    const allFilters = buildFilters();
    const valorantFilters = buildFilters({ game: "valorant" });
    const finishedFilters = buildFilters({ status: "finished" });
    const allKey = buildKey(allFilters);
    const valorantKey = buildKey(valorantFilters);
    const finishedKey = buildKey(finishedFilters);
    const cache = new Map([
      [allKey, "stale aggregate"],
      [valorantKey, "current valorant"],
      [finishedKey, "different status"]
    ]);

    invalidateRelatedDisplayCacheEntries(cache, valorantFilters, valorantKey);

    expect(cache.get(allKey)).toBeUndefined();
    expect(cache.get(valorantKey)).toBe("current valorant");
    expect(cache.get(finishedKey)).toBe("different status");
  });
});
