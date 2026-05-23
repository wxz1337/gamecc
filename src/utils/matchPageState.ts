import { addBeijingDays, getBeijingTodayDate } from "../../shared/date";
import { GameFilter, MatchSort, MatchView } from "../../shared/match";
import { parseMatchQueryParams } from "../../shared/validators";

export type MatchPageState = {
  view: MatchView;
  from: string;
  to: string;
  game: GameFilter;
  status: "all" | "not_started" | "running" | "finished" | "postponed" | "cancelled";
  query: string;
  league: string;
  team: string;
  region: string;
  stage: string;
  sort: MatchSort;
};

export const MAX_MATCH_RANGE_DAYS = 31;

function getViewDefaults(view: MatchView) {
  const today = getBeijingTodayDate();

  if (view === "results") {
    return {
      from: addBeijingDays(today, -6),
      to: today,
      status: "finished" as const,
      sort: "beginAt_desc" as const
    };
  }

  return {
    from: today,
    to: addBeijingDays(today, 7),
    status: "all" as const,
    sort: "beginAt_asc" as const
  };
}

export function getDefaultMatchPageState(view: MatchView = "schedule"): MatchPageState {
  const defaults = getViewDefaults(view);

  return {
    view,
    from: defaults.from,
    to: defaults.to,
    game: "all",
    status: defaults.status,
    query: "",
    league: "",
    team: "",
    region: "",
    stage: "",
    sort: defaults.sort
  };
}

export function getNextViewState(state: MatchPageState, nextView: MatchView): MatchPageState {
  const nextDefaults = getViewDefaults(nextView);

  return {
    ...state,
    view: nextView,
    from: nextDefaults.from,
    to: nextDefaults.to,
    status: nextDefaults.status,
    sort: nextDefaults.sort
  };
}

export function resetMatchPageState(view: MatchView = "schedule"): MatchPageState {
  return getDefaultMatchPageState(view);
}

export function parseMatchPageState(search: string): MatchPageState {
  const params = new URLSearchParams(search);

  try {
    const parsed = parseMatchQueryParams({
      date: params.get("date") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      view: params.get("view") ?? undefined,
      game: params.get("game") ?? undefined,
      status: params.get("status") ?? undefined,
      query: params.get("query") ?? undefined,
      league: params.get("league") ?? undefined,
      team: params.get("team") ?? undefined,
      region: params.get("region") ?? undefined,
      stage: params.get("stage") ?? undefined,
      sort: params.get("sort") ?? undefined,
      refresh: params.get("refresh") ?? undefined
    });

    return {
      view: parsed.view,
      from: parsed.from,
      to: parsed.to,
      game: parsed.game,
      status: parsed.status,
      query: parsed.query ?? "",
      league: parsed.league ?? "",
      team: parsed.team ?? "",
      region: parsed.region ?? "",
      stage: parsed.stage ?? "",
      sort: parsed.sort
    };
  } catch {
    return getDefaultMatchPageState("schedule");
  }
}

export function buildMatchPageSearchParams(state: MatchPageState): URLSearchParams {
  const params = new URLSearchParams();

  params.set("view", state.view);
  params.set("from", state.from);
  params.set("to", state.to);
  params.set("game", state.game);
  params.set("status", state.status);
  params.set("sort", state.sort);

  if (state.query.trim()) {
    params.set("query", state.query.trim());
  }

  if (state.league.trim()) {
    params.set("league", state.league.trim());
  }

  if (state.team.trim()) {
    params.set("team", state.team.trim());
  }

  if (state.region.trim()) {
    params.set("region", state.region.trim());
  }

  if (state.stage.trim()) {
    params.set("stage", state.stage.trim());
  }

  return params;
}

export function updateMatchPageStateWithField<K extends keyof MatchPageState>(
  state: MatchPageState,
  key: K,
  value: MatchPageState[K]
): MatchPageState {
  return {
    ...state,
    [key]: value
  };
}
