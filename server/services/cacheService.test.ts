import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCacheKey, getAny, getFresh, set } from "./cacheService.js";

afterEach(() => {
  vi.restoreAllMocks();
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
        query: "edg",
        league: "lpl",
        team: "edg",
        region: "cn",
        stage: "playoffs",
        sort: "beginAt_desc"
      })
    ).toBe("matches:v2:2026-05-01:2026-05-24:results:lol:finished:edg:lpl:edg:cn:playoffs:beginAt_desc");
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
});