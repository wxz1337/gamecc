import { describe, expect, it } from "vitest";
import { AppError, ERROR_CODES, isAppError } from "./errors.js";
import { parseDateParam, parseGameFilter } from "./validators.js";

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
});