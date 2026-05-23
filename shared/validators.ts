import { GameFilter } from "./match.js";
import { AppError, ERROR_CODES } from "./errors.js";
import { isValidDateString } from "./date.js";

const VALID_GAME_FILTERS: GameFilter[] = ["all", "cs2", "valorant", "lol"];

export function parseDateParam(value: string | null | undefined): string {
  if (typeof value !== "string") {
    throw new AppError(ERROR_CODES.INVALID_DATE, "日期格式不正确", 400);
  }

  const trimmedValue = value.trim();

  if (!isValidDateString(trimmedValue)) {
    throw new AppError(ERROR_CODES.INVALID_DATE, "日期格式不正确", 400);
  }

  return trimmedValue;
}

export function parseGameFilter(value: string | null | undefined): GameFilter {
  if (value == null || value.trim() === "") {
    return "all";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (VALID_GAME_FILTERS.includes(normalizedValue as GameFilter)) {
    return normalizedValue as GameFilter;
  }

  throw new AppError(ERROR_CODES.INVALID_GAME, "不支持的游戏筛选", 400);
}