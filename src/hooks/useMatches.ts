import { useLayoutEffect, useRef, useState } from "react";
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

type MatchesSource = "live" | "mock";

type DisplayCacheEntry = {
  response: MatchesResponse;
  source: MatchesSource;
};

type VisibleDataEntry = DisplayCacheEntry & {
  key: string;
};

type DisplayCacheKeyParts = Omit<MatchPageState, "to">;

const DISPLAY_CACHE_LIMIT = 20;

function buildDisplayCacheKey(filters: MatchPageState): string {
  return JSON.stringify({
    view: filters.view,
    from: filters.from,
    game: filters.game,
    status: filters.status,
    tier: filters.tier,
    query: filters.query,
    league: filters.league,
    team: filters.team,
    region: filters.region,
    stage: filters.stage,
    sort: filters.sort
  });
}

function buildDisplayCacheScopeKey(filters: DisplayCacheKeyParts): string {
  return JSON.stringify({
    view: filters.view,
    from: filters.from,
    status: filters.status,
    tier: filters.tier,
    query: filters.query,
    league: filters.league,
    team: filters.team,
    region: filters.region,
    stage: filters.stage,
    sort: filters.sort
  });
}

export function invalidateRelatedDisplayCacheEntries<T>(cache: Map<string, T>, filters: MatchPageState, keepKey: string): void {
  const currentScopeKey = buildDisplayCacheScopeKey(filters);

  for (const key of cache.keys()) {
    if (key === keepKey) {
      continue;
    }

    try {
      const cachedFilters = JSON.parse(key) as DisplayCacheKeyParts;

      if (buildDisplayCacheScopeKey(cachedFilters) === currentScopeKey) {
        cache.delete(key);
      }
    } catch {
      // Ignore unrelated cache keys.
    }
  }
}

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

function createRequestFailureError(): MatchesApiError {
  return new MatchesApiError("赛程数据暂时获取失败。", 500, "REQUEST_FAILED");
}

export function useMatches({ filters }: UseMatchesParams): UseMatchesResult {
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, DisplayCacheEntry>());
  const [dataEntry, setDataEntry] = useState<VisibleDataEntry | null>(null);
  const [pendingDisplayKey, setPendingDisplayKey] = useState<string | null>(buildDisplayCacheKey(filters));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MatchesApiError | null>(null);
  const [appendError, setAppendError] = useState<MatchesApiError | null>(null);
  const [source, setSource] = useState<"live" | "mock" | "error">("live");
  const currentDisplayKey = buildDisplayCacheKey(filters);
  const cachedEntry = cacheRef.current.get(currentDisplayKey) ?? null;
  const visibleEntry =
    dataEntry?.key === currentDisplayKey
      ? dataEntry
      : cachedEntry
        ? { ...cachedEntry, key: currentDisplayKey }
        : null;
  const visibleData = visibleEntry?.response ?? null;
  const visibleSource = visibleEntry?.source ?? source;
  const visibleLoading = loading || (pendingDisplayKey === currentDisplayKey && visibleData == null && error == null);

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
  ): Promise<{ response: MatchesResponse; source: MatchesSource }> => {
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

  const storeDisplayCacheEntry = (key: string, entry: DisplayCacheEntry) => {
    const cache = cacheRef.current;

    if (cache.has(key)) {
      cache.delete(key);
    }

    cache.set(key, entry);

    while (cache.size > DISPLAY_CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }

      cache.delete(oldestKey);
    }
  };

  const getDisplayEntry = (key: string): VisibleDataEntry | null => {
    if (dataEntry?.key === key) {
      return dataEntry;
    }

    const cached = cacheRef.current.get(key) ?? null;
    return cached ? { ...cached, key } : null;
  };

  const loadMatches = async (
    requestFilters: MatchPageState,
    refresh: boolean,
    mode: "replace" | "append",
    displayKey = buildDisplayCacheKey(requestFilters)
  ) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setAppendError(null);
    setSource("live");
    setPendingDisplayKey(displayKey);

    if (mode === "replace") {
      const cached = cacheRef.current.get(displayKey) ?? null;
      setDataEntry(cached ? { ...cached, key: displayKey } : null);
    }

    try {
      const { response, source: nextSource } = await resolveMatchesResponse(requestFilters, refresh, controller.signal);

      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      setSource(nextSource);
      invalidateRelatedDisplayCacheEntries(cacheRef.current, requestFilters, displayKey);
      if (mode === "append") {
        const baseEntry = getDisplayEntry(displayKey);
        const mergedResponse = baseEntry ? mergeResponses(baseEntry.response, response) : response;
        const nextEntry = { key: displayKey, response: mergedResponse, source: nextSource } as VisibleDataEntry;

        storeDisplayCacheEntry(displayKey, { response: mergedResponse, source: nextSource });
        setDataEntry(nextEntry);
      } else {
        storeDisplayCacheEntry(displayKey, { response, source: nextSource });
        setDataEntry({ key: displayKey, response, source: nextSource });
      }
    } catch (caughtError) {
      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      if (caughtError instanceof MatchesApiError) {
        if (mode === "append") {
          setAppendError(caughtError);
        } else {
          setError(caughtError);
        }
      } else {
        const nextError = createRequestFailureError();
        if (mode === "append") {
          setAppendError(nextError);
        } else {
          setError(nextError);
        }
      }

      setSource("error");
      if (mode === "replace") {
        const fallbackEntry = getDisplayEntry(displayKey);
        setDataEntry(fallbackEntry);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useLayoutEffect(() => {
    void loadMatches(filters, false, "replace", currentDisplayKey);

    return () => {
      controllerRef.current?.abort();
    };
  }, [currentDisplayKey, filters]);

  return {
    data: visibleData,
    loading: visibleLoading,
    error,
    appendError,
    source: visibleSource,
    refresh: () => {
      const refreshFilters = visibleData
        ? {
            ...filters,
            from: visibleData.from,
            to: visibleData.to
          }
        : filters;

      void loadMatches(refreshFilters, true, "replace", currentDisplayKey);
    },
    appendMatches: async (nextFilters: MatchPageState) => {
      setAppendError(null);
      await loadMatches(nextFilters, false, "append", currentDisplayKey);
    }
  };
}
