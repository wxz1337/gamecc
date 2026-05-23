import { MatchesResponse, GameFilter } from "../../shared/match";

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
  date: string;
  game: GameFilter;
  refresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchMatches({ date, game, refresh = false, signal }: FetchMatchesParams): Promise<MatchesResponse> {
  const url = new URL("/api/matches", window.location.origin);

  url.searchParams.set("date", date);
  url.searchParams.set("game", game);

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