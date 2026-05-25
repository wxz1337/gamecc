import { AppError, ERROR_CODES } from "../../shared/errors.js";
import { GameType, MatchStatus } from "../../shared/match.js";
import { PandaScoreMatch } from "../types/pandascore.js";

const PANDASCORE_BASE_URL = "https://api.pandascore.co";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRY_COUNT = 1;

const ENDPOINTS: Record<GameType, string> = {
  cs2: "csgo/matches",
  valorant: "valorant/matches",
  lol: "lol/matches"
};

type FetchMatchesRange = {
  startUtc: Date;
  endUtc: Date;
};

type FetchMatchesOptions = {
  statuses?: MatchStatus[];
};

function getTimeoutMs(): number {
  const value = Number(process.env.PANDASCORE_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function getRetryCount(): number {
  const value = Number(process.env.PANDASCORE_REQUEST_RETRY_COUNT ?? DEFAULT_RETRY_COUNT);

  if (!Number.isFinite(value)) {
    return DEFAULT_RETRY_COUNT;
  }

  const normalized = Math.trunc(value);
  return Math.min(Math.max(normalized, 0), 3);
}

function buildMatchesUrl(game: GameType, range: FetchMatchesRange, options: FetchMatchesOptions = {}): URL {
  const url = new URL(ENDPOINTS[game], PANDASCORE_BASE_URL);

  url.searchParams.set("range[begin_at]", `${range.startUtc.toISOString()},${range.endUtc.toISOString()}`);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("sort", "begin_at");

  if (options.statuses && options.statuses.length > 0) {
    url.searchParams.set("filter[status]", options.statuses.join(","));
  }

  return url;
}

async function parseMatchesResponse(response: Response): Promise<PandaScoreMatch[]> {
  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new AppError(ERROR_CODES.PANDASCORE_REQUEST_FAILED, "赛程数据暂时获取失败，请稍后重试。", 502);
  }

  return payload as PandaScoreMatch[];
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchMatchesPage(url: URL, token: string): Promise<PandaScoreMatch[]> {
  const maxAttempts = getRetryCount() + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.PANDASCORE_REQUEST_FAILED, "赛程数据暂时获取失败，请稍后重试。", 502);
      }

      return await parseMatchesResponse(response);
    } catch (error) {
      if (!isAbortError(error) && !(error instanceof TypeError)) {
        throw error;
      }

      lastError = error;

      if (attempt >= maxAttempts) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

export async function fetchPandaScoreMatches(
  game: GameType,
  range: FetchMatchesRange,
  options: FetchMatchesOptions = {}
): Promise<PandaScoreMatch[]> {
  const token = process.env.PANDASCORE_API_TOKEN?.trim();

  if (!token) {
    throw new AppError(ERROR_CODES.TOKEN_MISSING, "服务端未配置数据源。", 500);
  }

  const perPage = 100;
  const maxPages = 10;
  const matches: PandaScoreMatch[] = [];

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const url = buildMatchesUrl(game, range, options);
      url.searchParams.set("page", String(page));

      const pageMatches = await fetchMatchesPage(url, token);
      matches.push(...pageMatches);

      if (pageMatches.length < perPage) {
        break;
      }
    }

    return matches;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504);
    }

    throw new AppError(ERROR_CODES.PANDASCORE_REQUEST_FAILED, "赛程数据暂时获取失败，请稍后重试。", 502);
  }
}
