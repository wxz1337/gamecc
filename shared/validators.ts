import { addBeijingDays, getBeijingTodayDate, getDateSpanDays, isValidDateString } from "./date.js";
import {
  GameFilter,
  MatchFilters,
  MatchQuery,
  MatchSort,
  MatchStatusFilter,
  MatchView
} from "./match.js";
import { AppError, ERROR_CODES } from "./errors.js";

const VALID_GAME_FILTERS: GameFilter[] = ["all", "cs2", "valorant", "lol"];
const VALID_STATUS_FILTERS: MatchStatusFilter[] = ["all", "not_started", "running", "finished", "postponed", "cancelled"];
const VALID_SORTS: MatchSort[] = ["beginAt_asc", "beginAt_desc", "status", "updatedAt_desc", "league"];
const VALID_VIEWS: MatchView[] = ["schedule", "results"];

function getStringValue(value: string | string[] | null | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item) => typeof item === "string");

    return typeof firstValue === "string" ? firstValue : undefined;
  }

  return undefined;
}

function normalizeText(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}

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

export function parseDateRange(
  date: string | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined
): Pick<MatchFilters, "from" | "to"> & { date?: string } {
  const normalizedFrom = normalizeText(from);
  const normalizedTo = normalizeText(to);
  const normalizedDate = normalizeText(date);

  if (normalizedFrom != null || normalizedTo != null) {
    if (normalizedFrom == null || normalizedTo == null) {
      throw new AppError(ERROR_CODES.INVALID_DATE_RANGE, "日期范围不正确", 400);
    }

    const parsedFrom = parseDateParam(normalizedFrom);
    const parsedTo = parseDateParam(normalizedTo);

    if (parsedFrom > parsedTo) {
      throw new AppError(ERROR_CODES.INVALID_DATE_RANGE, "日期范围不正确", 400);
    }

    if (getDateSpanDays(parsedFrom, parsedTo) > 31) {
      throw new AppError(ERROR_CODES.DATE_RANGE_TOO_LARGE, "日期范围不能超过 31 天", 400);
    }

    return {
      from: parsedFrom,
      to: parsedTo
    };
  }

  if (normalizedDate != null) {
    const parsedDate = parseDateParam(normalizedDate);

    return {
      date: parsedDate,
      from: parsedDate,
      to: parsedDate
    };
  }

  const today = getBeijingTodayDate();

  return {
    from: today,
    to: today
  };
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

export function parseMatchView(value: string | null | undefined): MatchView {
  if (value == null || value.trim() === "") {
    return "schedule";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (VALID_VIEWS.includes(normalizedValue as MatchView)) {
    return normalizedValue as MatchView;
  }

  throw new AppError(ERROR_CODES.INVALID_FILTER, "不支持的视图筛选", 400);
}

export function parseMatchStatus(value: string | null | undefined): MatchStatusFilter {
  if (value == null || value.trim() === "") {
    return "all";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (VALID_STATUS_FILTERS.includes(normalizedValue as MatchStatusFilter)) {
    return normalizedValue as MatchStatusFilter;
  }

  throw new AppError(ERROR_CODES.INVALID_STATUS, "不支持的比赛状态筛选", 400);
}

export function parseMatchSort(value: string | null | undefined): MatchSort {
  if (value == null || value.trim() === "") {
    return "beginAt_asc";
  }

  const normalizedValue = value.trim();

  if (VALID_SORTS.includes(normalizedValue as MatchSort)) {
    return normalizedValue as MatchSort;
  }

  throw new AppError(ERROR_CODES.INVALID_SORT, "不支持的排序方式", 400);
}

export function parseOptionalTextFilter(
  value: string | string[] | null | undefined,
  code: typeof ERROR_CODES.INVALID_QUERY | typeof ERROR_CODES.INVALID_FILTER
): string | undefined {
  const normalizedValue = normalizeText(getStringValue(value));

  if (normalizedValue == null) {
    return undefined;
  }

  if (normalizedValue.length > 80) {
    throw new AppError(code, "筛选条件长度不能超过 80 个字符", 400);
  }

  return normalizedValue;
}

export function parseMatchQueryParams(query: Record<string, string | string[] | undefined>): MatchQuery {
  const view = parseMatchView(getStringValue(query.view));
  const dateRange = parseDateRange(getStringValue(query.date), getStringValue(query.from), getStringValue(query.to));
  const hasExplicitDateRange = getStringValue(query.from) != null || getStringValue(query.to) != null || getStringValue(query.date) != null;
  const defaultFrom = view === "results" ? addBeijingDays(getBeijingTodayDate(), -6) : getBeijingTodayDate();
  const defaultTo = view === "results" ? getBeijingTodayDate() : addBeijingDays(getBeijingTodayDate(), 7);
  const status = parseMatchStatus(getStringValue(query.status));
  const sort = parseMatchSort(getStringValue(query.sort));

  return {
    ...(hasExplicitDateRange ? dateRange : { from: defaultFrom, to: defaultTo }),
    date: dateRange.date,
    view,
    game: parseGameFilter(getStringValue(query.game)),
    status: status === "all" && view === "results" ? "finished" : status,
    query: parseOptionalTextFilter(query.query, ERROR_CODES.INVALID_QUERY),
    league: parseOptionalTextFilter(query.league, ERROR_CODES.INVALID_FILTER),
    team: parseOptionalTextFilter(query.team, ERROR_CODES.INVALID_FILTER),
    region: parseOptionalTextFilter(query.region, ERROR_CODES.INVALID_FILTER),
    stage: parseOptionalTextFilter(query.stage, ERROR_CODES.INVALID_FILTER),
    sort: sort === "beginAt_asc" && view === "results" ? "beginAt_desc" : sort,
    refresh: getStringValue(query.refresh) === "1"
  };
}