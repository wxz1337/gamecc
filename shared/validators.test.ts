import { describe, expect, it } from "vitest";
import { AppError, ERROR_CODES, isAppError } from "./errors.js";
import {
  parseDateParam,
  parseDateRange,
  parseGameFilter,
  parseMatchQueryParams,
  parseMatchSort,
  parseMatchStatus,
  parseMatchTier,
  parseMatchView,
  parseOptionalTextFilter
} from "./validators.js";

describe("validators", () => {
  it("parses game filters and defaults to all", () => {
    expect(parseGameFilter(undefined)).toBe("all");
    expect(parseGameFilter("")).toBe("all");
    expect(parseGameFilter("LOL")).toBe("lol");
  });

  it("rejects unsupported game filters", () => {
    expect(() => parseGameFilter("dota2")).toThrow(AppError);
    try {
      parseGameFilter("dota2");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      expect((error as AppError).code).toBe(ERROR_CODES.INVALID_GAME);
      expect((error as AppError).status).toBe(400);
    }
  });

  it("parses valid date parameters and rejects invalid ones", () => {
    expect(parseDateParam("2026-05-24")).toBe("2026-05-24");
    expect(() => parseDateParam("2026-5-24")).toThrow(AppError);
  });

  it("parses old and new date range parameters", () => {
    expect(parseDateRange("2026-05-24", undefined, undefined)).toEqual({
      date: "2026-05-24",
      from: "2026-05-24",
      to: "2026-05-24"
    });
    expect(parseDateRange(undefined, "2026-05-01", "2026-05-24")).toEqual({
      from: "2026-05-01",
      to: "2026-05-24"
    });
    expect(() => parseDateRange(undefined, "2026-05-24", "2026-05-01")).toThrow(AppError);
  });

  it("parses match filters and rejects invalid status or sort values", () => {
    expect(parseMatchView(undefined)).toBe("schedule");
    expect(parseMatchStatus(undefined)).toBe("all");
    expect(parseMatchSort(undefined)).toBe("beginAt_asc");
    expect(parseMatchTier(undefined)).toBe("S,A");
    expect(parseMatchTier("all")).toBe("all");
    expect(parseMatchTier("a")).toBe("A");
    expect(parseMatchTier("a,s")).toBe("S,A");
    expect(parseOptionalTextFilter("  LPL  ", ERROR_CODES.INVALID_FILTER)).toBe("LPL");
    expect(() => parseMatchStatus("pending")).toThrow(AppError);
    expect(() => parseMatchSort("updated_at")).toThrow(AppError);
    expect(() => parseMatchTier("D")).toThrow(AppError);
  });

  it("normalizes legacy and default query parameters", () => {
    const query = parseMatchQueryParams({
      date: "2026-05-24",
      game: "all",
      status: "finished",
      query: "  edg  ",
      sort: "beginAt_desc"
    });

    expect(query).toMatchObject({
      date: "2026-05-24",
      from: "2026-05-24",
      to: "2026-05-24",
      game: "all",
      status: "finished",
      tier: "S,A",
      query: "edg",
      sort: "beginAt_desc",
      refresh: false
    });
  });

  it("rejects ranges larger than 31 days", () => {
    expect(() => parseDateRange(undefined, "2026-05-01", "2026-06-01")).toThrow(AppError);
    try {
      parseDateRange(undefined, "2026-05-01", "2026-06-01");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      expect((error as AppError).code).toBe(ERROR_CODES.DATE_RANGE_TOO_LARGE);
    }
  });
});
