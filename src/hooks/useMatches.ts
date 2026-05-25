import { useEffect, useRef, useState } from "react";
import { Match, MatchFacets, MatchesResponse } from "../../shared/match";
import { fetchMatches, MatchesApiError } from "../api/matches";
import { createMockMatchesResponse } from "../mocks/matches";
import { MatchPageState } from "../utils/matchPageState";
import { GAME_LABELS, STATUS_LABELS } from "../constants/matches";

type UseMatchesParams = {
  filters: MatchPageState;
};

type UseMatchesResult = {
  data: MatchesResponse | null;
  loading: boolean;
  error: MatchesApiError | null;
  appendError: MatchesApiError | null;
  source: "live" | "mock" | "error";
  refresh: () => void;
  appendMatches: (filters: MatchPageState) => Promise<void>;
};

function buildFacetOptions(values: Map<string, number>, labelMapper: (value: string) => string) {
  return [...values.entries()]
    .filter(([value]) => value.trim() !== "")
    .map(([value, count]) => ({
      value,
      label: labelMapper(value),
      count
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN", { sensitivity: "base" }));
}

function buildMatchFacets(matches: Match[]): MatchFacets {
  const games = new Map<string, number>();
  const statuses = new Map<string, number>();
  const leagues = new Map<string, number>();
  const teams = new Map<string, number>();
  const regions = new Map<string, number>();
  const stages = new Map<string, number>();

  for (const match of matches) {
    games.set(match.game, (games.get(match.game) ?? 0) + 1);
    statuses.set(match.status, (statuses.get(match.status) ?? 0) + 1);
    leagues.set(match.league, (leagues.get(match.league) ?? 0) + 1);

    if (match.tournamentRegion) {
      regions.set(match.tournamentRegion, (regions.get(match.tournamentRegion) ?? 0) + 1);
    }

    if (match.tournamentCountry) {
      regions.set(match.tournamentCountry, (regions.get(match.tournamentCountry) ?? 0) + 1);
    }

    if (match.stage) {
      stages.set(match.stage, (stages.get(match.stage) ?? 0) + 1);
    }

    for (const team of match.teams) {
      if (team.name) {
        teams.set(team.name, (teams.get(team.name) ?? 0) + 1);
      }
    }
  }

  return {
    games: buildFacetOptions(games, (value) => GAME_LABELS[value as keyof typeof GAME_LABELS] ?? value),
    statuses: buildFacetOptions(statuses, (value) => STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? value),
    leagues: buildFacetOptions(leagues, (value) => value),
    teams: buildFacetOptions(teams, (value) => value),
    regions: buildFacetOptions(regions, (value) => value),
    stages: buildFacetOptions(stages, (value) => value)
  };
}

function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((left, right) => {
    const leftBegin = new Date(left.beginAt).getTime();
    const rightBegin = new Date(right.beginAt).getTime();

    return leftBegin - rightBegin || left.id.localeCompare(right.id);
  });
}

function mergeWarnings(
  left: NonNullable<MatchesResponse["warnings"]> | undefined,
  right: NonNullable<MatchesResponse["warnings"]> | undefined
): NonNullable<MatchesResponse["warnings"]> | undefined {
  const warnings = [...(left ?? []), ...(right ?? [])];

  return warnings.length > 0 ? warnings : undefined;
}

function mergeResponses(current: MatchesResponse, next: MatchesResponse): MatchesResponse {
  const matchesById = new Map(current.matches.map((match) => [match.id, match]));

  for (const match of next.matches) {
    matchesById.set(match.id, match);
  }

  const mergedMatches = sortMatches([...matchesById.values()]);
  const warnings = mergeWarnings(current.warnings, next.warnings);

  return {
    ...current,
    date: mergedMatches.length > 0 && current.from === next.from && current.from === next.to ? current.date ?? next.date : undefined,
    from: current.from,
    to: next.to > current.to ? next.to : current.to,
    filters: current.filters,
    sort: current.sort,
    stale: current.stale || next.stale,
    updatedAt: next.updatedAt,
    total: mergedMatches.length,
    facets: buildMatchFacets(mergedMatches),
    game: current.game,
    partial: current.partial || next.partial || warnings != null ? true : undefined,
    warnings,
    matches: mergedMatches
  };
}

export function useMatches({ filters }: UseMatchesParams): UseMatchesResult {
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MatchesApiError | null>(null);
  const [appendError, setAppendError] = useState<MatchesApiError | null>(null);
  const [source, setSource] = useState<"live" | "mock" | "error">("live");

  const getMockRequestFilters = (current: MatchPageState): MatchPageState => {
    if (current.status !== "running") {
      return current;
    }

    return {
      ...current,
      status: "all"
    };
  };

  const resolveMatchesResponse = async (
    currentFilters: MatchPageState,
    refresh: boolean,
    signal: AbortSignal
  ): Promise<{ response: MatchesResponse; source: "live" | "mock" }> => {
    try {
      return {
        response: await fetchMatches({
          filters: currentFilters,
          refresh,
          signal
        }),
        source: "live" as const
      };
    } catch (caughtError) {
      if (caughtError instanceof MatchesApiError && caughtError.code === "TOKEN_MISSING" && import.meta.env.DEV) {
        return {
          response: createMockMatchesResponse(getMockRequestFilters(currentFilters)),
          source: "mock" as const
        };
      }

      throw caughtError;
    }
  };

  const loadMatches = async (requestFilters: MatchPageState, refresh: boolean, mode: "replace" | "append") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setAppendError(null);
    setSource("live");

    try {
      const { response, source: nextSource } = await resolveMatchesResponse(requestFilters, refresh, controller.signal);

      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      setSource(nextSource);
      setData((current) => {
        if (mode === "append" && current) {
          return mergeResponses(current, response);
        }

        return response;
      });
    } catch (caughtError) {
      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      if (caughtError instanceof MatchesApiError) {
        if (caughtError.code === "TOKEN_MISSING" && import.meta.env.DEV) {
          setData(createMockMatchesResponse(getMockRequestFilters(filters)));
          setSource("mock");
          setError(null);
          setAppendError(null);
          return;
        }

        if (mode === "append") {
          setAppendError(caughtError);
        } else {
          setError(caughtError);
        }
      } else {
        const nextError = new MatchesApiError("赛程数据暂时获取失败。", 500, "REQUEST_FAILED");
        if (mode === "append") {
          setAppendError(nextError);
        } else {
          setError(nextError);
        }
      }

      setSource("error");
      setData((current) => {
        if (mode === "append") {
          return current;
        }

        return null;
      });
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMatches(filters, false, "replace");

    return () => {
      controllerRef.current?.abort();
    };
  }, [filters]);

  return {
    data,
    loading,
    error,
    appendError,
    source,
    refresh: () => {
      const refreshFilters = data
        ? {
            ...filters,
            from: data.from,
            to: data.to
          }
        : filters;

      void loadMatches(refreshFilters, true, "replace");
    },
    appendMatches: async (nextFilters: MatchPageState) => {
      setAppendError(null);
      await loadMatches(nextFilters, false, "append");
      return;
    }
  };
}
