import { getBeijingTodayDate, getBeijingWeekDates } from "../../shared/date";
import type { MatchPageState } from "./matchPageState";

function clampDate(date: string, minDate: string, maxDate: string): string {
  if (date < minDate) {
    return minDate;
  }

  if (date > maxDate) {
    return maxDate;
  }

  return date;
}

export function getTimelineBounds(anchorDate: string) {
  const weekDates = getBeijingWeekDates(anchorDate);

  return {
    from: anchorDate,
    to: weekDates[6]
  };
}

export function getTimelineToDate(anchorDate: string): string {
  return getTimelineBounds(anchorDate).to;
}

export function normalizeTimelineState(state: MatchPageState, anchorDate: string): MatchPageState {
  const bounds = getTimelineBounds(anchorDate);
  const from = clampDate(state.from, bounds.from, bounds.to);
  const status = state.status === "finished" ? "finished" : "running";

  return {
    ...state,
    from,
    to: bounds.to,
    status,
    sort: "beginAt_asc"
  };
}

export function buildTimelineStateForDate(date: string, today: string = getBeijingTodayDate()): Pick<MatchPageState, "from" | "to" | "status" | "sort"> {
  const status = date < today ? "finished" : "running";

  return {
    from: date,
    to: getTimelineToDate(date),
    status,
    sort: "beginAt_asc"
  };
}

export function shouldLoadMoreTimeline(params: {
  loading: boolean;
  isLoadingMore: boolean;
  loadedTimelineTo: string;
  timelineEnd: string;
  hasData: boolean;
}): boolean {
  if (params.loading || params.isLoadingMore || !params.hasData) {
    return false;
  }

  if (params.loadedTimelineTo >= params.timelineEnd) {
    return false;
  }

  return true;
}

