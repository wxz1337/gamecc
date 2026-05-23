import { useEffect, useRef, useState } from "react";
import { GameFilter, MatchesResponse } from "../../shared/match";
import { fetchMatches, MatchesApiError } from "../api/matches";
import { createMockMatchesResponse } from "../mocks/matches";

type UseMatchesParams = {
  date: string;
  game: GameFilter;
};

type UseMatchesResult = {
  data: MatchesResponse | null;
  loading: boolean;
  error: MatchesApiError | null;
  source: "live" | "mock" | "error";
  refresh: () => void;
};

export function useMatches({ date, game }: UseMatchesParams): UseMatchesResult {
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MatchesApiError | null>(null);
  const [source, setSource] = useState<"live" | "mock" | "error">("live");

  const loadMatches = async (refresh: boolean) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setSource("live");

    try {
      const response = await fetchMatches({
        date,
        game,
        refresh,
        signal: controller.signal
      });

      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      setData(response);
    } catch (caughtError) {
      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      if (caughtError instanceof MatchesApiError) {
        if (caughtError.code === "TOKEN_MISSING" && import.meta.env.DEV) {
          setData(createMockMatchesResponse(date, game));
          setSource("mock");
          setError(null);
          return;
        }

        setError(caughtError);
      } else {
        setError(new MatchesApiError("赛程数据暂时获取失败。", 500, "REQUEST_FAILED"));
      }

      setSource("error");

      setData(null);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMatches(false);

    return () => {
      controllerRef.current?.abort();
    };
  }, [date, game]);

  return {
    data,
    loading,
    error,
    source,
    refresh: () => {
      void loadMatches(true);
    }
  };
}