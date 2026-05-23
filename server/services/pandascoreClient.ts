import { AppError, ERROR_CODES } from "../../shared/errors.js";
import { GameType } from "../../shared/match.js";
import { PandaScoreMatch } from "../types/pandascore.js";

const PANDASCORE_BASE_URL = "https://api.pandascore.co";
const DEFAULT_TIMEOUT_MS = 8_000;

const ENDPOINTS: Record<GameType, string> = {
  cs2: "csgo/matches",
  valorant: "valorant/matches",
  lol: "lol/matches"
};

type FetchMatchesRange = {
  startUtc: Date;
  endUtc: Date;
};

function getTimeoutMs(): number {
  const value = Number(process.env.PANDASCORE_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function buildMatchesUrl(game: GameType, range: FetchMatchesRange): URL {
  const url = new URL(ENDPOINTS[game], PANDASCORE_BASE_URL);

  url.searchParams.set("range[begin_at]", `${range.startUtc.toISOString()},${range.endUtc.toISOString()}`);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("sort", "begin_at");

  return url;
}

async function parseMatchesResponse(response: Response): Promise<PandaScoreMatch[]> {
  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new AppError(ERROR_CODES.PANDASCORE_REQUEST_FAILED, "赛程数据暂时获取失败，请稍后重试。", 502);
  }

  return payload as PandaScoreMatch[];
}

export async function fetchPandaScoreMatches(
  game: GameType,
  range: FetchMatchesRange
): Promise<PandaScoreMatch[]> {
  const token = process.env.PANDASCORE_API_TOKEN?.trim();

  if (!token) {
    throw new AppError(ERROR_CODES.TOKEN_MISSING, "服务端未配置数据源。", 500);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());
  const perPage = 100;
  const maxPages = 10;
  const matches: PandaScoreMatch[] = [];

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const url = buildMatchesUrl(game, range);
      url.searchParams.set("page", String(page));

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

      const pageMatches = await parseMatchesResponse(response);
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

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError(ERROR_CODES.PANDASCORE_TIMEOUT, "赛程数据请求超时，请稍后重试。", 504);
    }

    throw new AppError(ERROR_CODES.PANDASCORE_REQUEST_FAILED, "赛程数据暂时获取失败，请稍后重试。", 502);
  } finally {
    clearTimeout(timeoutId);
  }
}