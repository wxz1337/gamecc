import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCacheKey,
  buildResponseCacheKey,
  buildSourceWindowCacheKey,
  clearCache,
  getAny,
  getFresh,
  invalidateMatchResponseCache,
  set
} from "./cacheService.js";

afterEach(() => {
  vi.restoreAllMocks();
  clearCache();
});

describe("cacheService", () => {
  it("builds stable cache keys", () => {
    expect(buildCacheKey("2026-05-24", "all")).toBe("matches:2026-05-24:all");
    expect(
      buildCacheKey({
        from: "2026-05-01",
        to: "2026-05-24",
        view: "results",
        game: "lol",
        status: "finished",
        tier: "S,A",
        query: "edg",
        league: "lpl",
        team: "edg",
        region: "cn",
        stage: "playoffs",
        sort: "beginAt_desc"
      })
    ).toBe("matches:v2:2026-05-01:2026-05-24:results:lol:finished:S,A:edg:lpl:edg:cn:playoffs:beginAt_desc");
  });

  it("builds the v3 response cache key and the source window key", () => {
    expect(
      buildResponseCacheKey({
        from: "2026-05-01",
        to: "2026-05-24",
        view: "results",
        game: "lol",
        status: "finished",
        tier: "S,A",
        query: "EDG",
        league: "LPL",
        team: "EDG",
        region: "CN",
        stage: "Playoffs",
        sort: "beginAt_desc"
      })
    ).toBe("matches-response:v3:2026-05-01:2026-05-24:results:lol:finished:S,A:cn:beginAt_desc:edg:lpl:edg:playoffs");

    const firstKey = buildSourceWindowCacheKey({
      from: "2026-05-01",
      to: "2026-05-24",
      game: "lol",
      statusGroup: "results_running"
    });
    const secondKey = buildSourceWindowCacheKey({
      from: "2026-05-01",
      to: "2026-05-24",
      game: "lol",
      statusGroup: "results_running",
      tier: "S,A",
      region: "CN",
      sort: "beginAt_desc",
      query: "edg",
      league: "lpl",
      team: "edg",
      stage: "playoffs"
    } as any);

    expect(firstKey).toBe("source-window:v1:lol:2026-05-01:2026-05-24:results_running");
    expect(secondKey).toBe(firstKey);
  });

  it("returns fresh entries and hides expired ones from getFresh", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000_000);

    set("matches:2026-05-24:all", { value: "fresh" }, 1);

    expect(getFresh<{ value: string }>("matches:2026-05-24:all")).toEqual({ value: "fresh" });

    nowSpy.mockReturnValue(1_002_000);

    expect(getFresh<{ value: string }>("matches:2026-05-24:all")).toBeNull();
    expect(getAny<{ value: string }>("matches:2026-05-24:all")).toEqual({ value: "fresh" });
  });

  it("invalidates overlapping aggregate and game response caches", () => {
    const buildQuery = (game: "all" | "lol" | "cs2", from = "2026-06-08", to = "2026-06-14") => ({
      from,
      to,
      view: "schedule" as const,
      game,
      status: "running" as const,
      tier: "S,A",
      sort: "beginAt_asc" as const
    });
    const allKey = buildResponseCacheKey(buildQuery("all"));
    const lolKey = buildResponseCacheKey(buildQuery("lol"));
    const cs2Key = buildResponseCacheKey(buildQuery("cs2"));
    const otherRangeKey = buildResponseCacheKey(buildQuery("all", "2026-06-20", "2026-06-21"));

    set(allKey, "all");
    set(lolKey, "lol");
    set(cs2Key, "cs2");
    set(otherRangeKey, "other-range");

    invalidateMatchResponseCache({ game: "lol", from: "2026-06-10", to: "2026-06-10" });

    expect(getAny(allKey)).toBeNull();
    expect(getAny(lolKey)).toBeNull();
    expect(getAny(cs2Key)).toBe("cs2");
    expect(getAny(otherRangeKey)).toBe("other-range");
  });
});
