import { getBeijingTodayDate } from "../../shared/date";
import { GameFilter, MatchSort, MatchTierFilter, MatchView } from "../../shared/match";
import { parseMatchQueryParams } from "../../shared/validators";
import { REGION_FILTER_OPTIONS } from "../constants/matches";

export type MatchPageState = {
  view: MatchView;
  from: string;
  to: string;
  game: GameFilter;
  status: "all" | "not_started" | "running" | "finished" | "postponed" | "cancelled";
  tier: MatchTierFilter;
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

  return {
    from: today,
    to: today,
    status: "running" as const,
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
    tier: "S,A",
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
  const viewFromParams = params.get("view");
  const defaults = getViewDefaults(viewFromParams === "results" ? "results" : "schedule");

  try {
    const parsed = parseMatchQueryParams({
      date: params.get("date") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      view: params.get("view") ?? undefined,
      game: params.get("game") ?? undefined,
      status: params.get("status") ?? undefined,
      tier: params.get("tier") ?? undefined,
      query: undefined,
      league: undefined,
      team: undefined,
      region: params.get("region") ?? undefined,
      stage: undefined,
      sort: undefined,
      refresh: params.get("refresh") ?? undefined
    });
    const region = REGION_FILTER_OPTIONS[parsed.game].some((option) => option.value === (parsed.region ?? "")) ? parsed.region ?? "" : "";

    return {
      view: parsed.view,
      from: parsed.from,
      to: parsed.to,
      game: parsed.game,
      status: params.has("status") ? parsed.status : defaults.status,
      tier: parsed.tier,
      query: parsed.query ?? "",
      league: parsed.league ?? "",
      team: parsed.team ?? "",
      region,
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
  params.set("tier", state.tier);
  params.set("sort", state.sort);

  if (state.region.trim()) {
    params.set("region", state.region.trim());
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
