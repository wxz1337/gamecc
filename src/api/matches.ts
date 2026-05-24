import { MatchesResponse } from "../../shared/match";
import { MatchPageState, buildMatchPageSearchParams } from "../utils/matchPageState";

export class MatchesApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "MatchesApiError";
    this.status = status;
    this.code = code;
  }
}

type FetchMatchesParams = {
  filters: MatchPageState;
  refresh?: boolean;
  signal?: AbortSignal;
};

function getApiUrl(path: string): URL {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  return new URL(path, apiBaseUrl || window.location.origin);
}

export async function fetchMatches({ filters, refresh = false, signal }: FetchMatchesParams): Promise<MatchesResponse> {
  const url = getApiUrl("/api/matches");

  const searchParams = buildMatchPageSearchParams(filters);

  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (refresh) {
    url.searchParams.set("refresh", "1");
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    },
    signal
  });

  const payload = (await response.json().catch(() => null)) as
    | MatchesResponse
    | { error?: { code?: string; message?: string } }
    | null;

  if (!response.ok) {
    const errorMessage = payload && "error" in payload && payload.error?.message ? payload.error.message : "赛程数据暂时获取失败。";
    const errorCode = payload && "error" in payload && payload.error?.code ? payload.error.code : "REQUEST_FAILED";

    throw new MatchesApiError(errorMessage, response.status, errorCode);
  }

  return payload as MatchesResponse;
}
