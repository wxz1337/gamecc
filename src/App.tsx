import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, RefreshCw, RotateCcw, Filter, ChevronDown } from "lucide-react";
import { BEIJING_TIME_ZONE, addBeijingDays, getBeijingTodayDate, getBeijingWeekDates, isValidDateString } from "../shared/date";
import { MatchPageState, buildMatchPageSearchParams, parseMatchPageState, resetMatchPageState } from "./utils/matchPageState";
import {
  buildTimelineStateForDate,
  getTimelineBounds,
  getTimelineToDate,
  normalizeTimelineState,
  shouldLoadMoreTimeline
} from "./utils/timelineRange";
import {
  GAME_FILTER_OPTIONS,
  GAME_LABELS,
  MATCH_STATUS_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
  STATUS_LABELS,
  TIER_FILTER_OPTIONS
} from "./constants/matches";
import { useMatches } from "./hooks/useMatches";
import { EmptyState, ErrorState, LoadingState } from "./components/StatePanels";
import { MatchList } from "./components/MatchList";
import { MatchCalendarPicker } from "./components/MatchCalendarPicker";
import { formatUpdatedAt, getEmptyStateMessage } from "./utils/matchFormatters";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { FilterTabs } from "./components/FilterTabs";
import { WeekStrip } from "./components/WeekStrip";
import { DashboardHero } from "./components/DashboardHero";
import type { MatchTier } from "../shared/match";

const TIER_ORDER: MatchTier[] = ["S", "A", "B", "C"];
const TIMELINE_LOAD_FUTURE_DAYS = 1;

function getSelectedTiers(tier: MatchPageState["tier"]): MatchTier[] {
  if (tier === "all") {
    return [];
  }

  return TIER_ORDER.filter((value) => tier.split(",").includes(value));
}

function hasAdvancedFilters(filters: MatchPageState) {
  return filters.region.trim() !== "" || filters.tier !== "S,A";
}

function formatTierLabel(tier: MatchPageState["tier"]): string {
  if (tier === "all") {
    return "全部级别";
  }

  const selectedTiers = getSelectedTiers(tier);

  return selectedTiers.length > 0 ? selectedTiers.map((value) => `${value}级`).join(" / ") : "S级 / A级";
}

function formatStatusFilterLabel(status: MatchPageState["status"]): string {
  if (status === "finished") {
    return STATUS_LABELS.finished;
  }

  return "进行中&未开始";
}

function getStatusForDate(date: string, today: string): MatchPageState["status"] {
  return date < today ? "finished" : "running";
}

function getInitialTimelineState(): MatchPageState {
  const params = new URLSearchParams(window.location.search);
  const parsedState = parseMatchPageState(window.location.search);
  const status = params.has("status") ? parsedState.status : getStatusForDate(parsedState.from, getBeijingTodayDate());
  const state = {
    ...parsedState,
    status
  };

  return normalizeTimelineState(state, state.from);
}

function App() {
  const initialTimelineState = useMemo(() => getInitialTimelineState(), []);
  const today = useMemo(() => getBeijingTodayDate(), []);
  const [filters, setFilters] = useState<MatchPageState>(initialTimelineState);
  const [activeDate, setActiveDate] = useState(initialTimelineState.from);
  const [timelineAnchorDate, setTimelineAnchorDate] = useState(initialTimelineState.from);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(() => hasAdvancedFilters(initialTimelineState));

  useEffect(() => {
    const onPopState = () => {
      const nextState = getInitialTimelineState();
      setFilters(nextState);
      setActiveDate(nextState.from);
      setTimelineAnchorDate(nextState.from);
      setShowMoreFilters(hasAdvancedFilters(nextState));
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollToTop(window.scrollY > 320);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const { data, loading, error, appendError, refresh, appendMatches } = useMatches({ filters });
  const isInitialLoading = loading && !data;

  useEffect(() => {
    const currentSearchState = data
      ? {
          ...filters,
          from: data.from,
          to: data.to
        }
      : filters;
    const nextSearch = buildMatchPageSearchParams(currentSearchState).toString();
    const currentSearch = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;

    if (nextSearch !== currentSearch) {
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, [data, filters]);

  useEffect(() => {
    if (!loading) {
      setIsLoadingMore(false);
    }
  }, [loading]);

  const weekDates = useMemo(() => getBeijingWeekDates(activeDate), [activeDate]);
  const timelineBounds = useMemo(() => getTimelineBounds(timelineAnchorDate), [timelineAnchorDate]);
  const regionOptions = REGION_FILTER_OPTIONS[filters.game];
  const selectedRegionLabel = regionOptions.find((option) => option.value === filters.region)?.label ?? "自定义赛区";
  const selectedTierLabel = formatTierLabel(filters.tier);
  const selectedTiers = getSelectedTiers(filters.tier);
  const currentStateLabel = formatStatusFilterLabel(filters.status);
  const currentGameLabel = filters.game === "all" ? "全部游戏" : GAME_LABELS[filters.game];
  const totalLabel = data ? `${data.total} 场` : loading ? "同步中" : "未载入";
  const runningCount = data?.matches.filter((match) => match.status === "running").length ?? 0;
  const listMatches = useMemo(() => {
    if (!data) {
      return [];
    }

    const visibleMatches = data.matches.filter((match) => {
      if (filters.status === "finished") {
        return match.status === "finished";
      }

      return match.status === "running" || match.status === "not_started";
    });

    return visibleMatches.sort((left, right) => {
      const leftBegin = new Date(left.beginAt).getTime();
      const rightBegin = new Date(right.beginAt).getTime();

      return leftBegin - rightBegin;
    });
  }, [data, filters.status]);
  const listTransitionKey = [timelineAnchorDate, filters.status, filters.game, filters.region, filters.tier].join("|");
  const loadedTimelineTo = data?.to ?? filters.to;
  const timelineComplete = loadedTimelineTo >= timelineBounds.to;
  const statusMessage = data?.stale
    ? "数据可能不是最新，已展示缓存内容。"
    : data?.partial
      ? "部分数据源同步失败，已先展示可用赛程。"
      : null;
  const matchCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    data?.matches.forEach((match) => {
      counts[match.displayDate] = (counts[match.displayDate] ?? 0) + 1;
    });

    return counts;
  }, [data]);

  const updateField = <K extends keyof MatchPageState>(key: K, value: MatchPageState[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const updateGame = (game: MatchPageState["game"]) => {
    setFilters((current) => ({
      ...current,
      game,
      region: ""
    }));
  };

  const updateTier = (tier: "all" | MatchTier) => {
    if (tier === "all") {
      updateField("tier", "all");
      return;
    }

    setFilters((current) => {
      const currentTiers = getSelectedTiers(current.tier);
      const nextTiers = currentTiers.includes(tier)
        ? currentTiers.filter((value) => value !== tier)
        : [...currentTiers, tier];
      const normalizedTiers = TIER_ORDER.filter((value) => nextTiers.includes(value));

      return {
        ...current,
        tier: normalizedTiers.length > 0 ? normalizedTiers.join(",") : "all"
      };
    });
  };

  const updateSelectedDate = (date: string) => {
    if (!isValidDateString(date)) {
      return;
    }

    setIsCalendarOpen(false);
    setIsLoadingMore(false);
    setActiveDate(date);
    setTimelineAnchorDate(date);
    setFilters((current) => ({
      ...current,
      ...buildTimelineStateForDate(date, today)
    }));
  };

  const moveDate = (days: number) => {
    updateSelectedDate(addBeijingDays(activeDate, days));
  };

  const handleReset = () => {
    setIsLoadingMore(false);
    setActiveDate(today);
    setTimelineAnchorDate(today);
    setShowMoreFilters(false);
    setFilters({
      ...resetMatchPageState("schedule"),
      ...buildTimelineStateForDate(today, today)
    });
  };

  const updateStatus = (status: MatchPageState["status"]) => {
    const nextStatus = status === "finished" ? "finished" : "running";

    setIsLoadingMore(false);
    setTimelineAnchorDate(activeDate);
    setFilters((current) => ({
      ...current,
      from: activeDate,
      to: getTimelineToDate(activeDate),
      status: nextStatus,
      sort: "beginAt_asc"
    }));
  };

  const loadPreviousMatches = useCallback(() => {
    // The selected date is the start of the timeline. Earlier dates require choosing another date.
  }, []);

  const loadFutureMatches = useCallback(() => {
    if (
      !shouldLoadMoreTimeline({
        loading,
        isLoadingMore,
        loadedTimelineTo,
        timelineEnd: timelineBounds.to,
        hasData: data != null
      })
    ) {
      return;
    }

    const nextDate = addBeijingDays(loadedTimelineTo, TIMELINE_LOAD_FUTURE_DAYS);
    const nextTo = nextDate > timelineBounds.to ? timelineBounds.to : nextDate;

    setIsLoadingMore(true);
    appendMatches({
      ...filters,
      from: nextDate,
      to: nextTo,
      sort: "beginAt_asc"
    }).finally(() => {
      setIsLoadingMore(false);
    });
  }, [appendMatches, data, filters, isLoadingMore, loadedTimelineTo, loading, timelineBounds.to]);

  const handleVisibleDateChange = useCallback((date: string) => {
    if (isValidDateString(date)) {
      setActiveDate(date);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans selection:bg-zinc-200">
      <div className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/80 pb-3 pt-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <WeekStrip
            dates={weekDates}
            isCalendarOpen={isCalendarOpen}
            onMoveDate={moveDate}
            onOpenCalendar={() => setIsCalendarOpen((current) => !current)}
            onSelectDate={updateSelectedDate}
            selectedDate={activeDate}
            today={today}
          />
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <DashboardHero activeDate={activeDate} runningCount={runningCount} totalLabel={totalLabel} />

        <div className="rounded-xl border border-zinc-200/70 bg-white/75 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:flex xl:flex-wrap xl:items-start xl:gap-4">
              <FilterTabs label="游戏" onChange={updateGame} options={GAME_FILTER_OPTIONS} value={filters.game} />
              <FilterTabs
                label="状态"
                onChange={(value) => updateStatus(value as MatchPageState["status"])}
                options={MATCH_STATUS_FILTER_OPTIONS}
                value={filters.status}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 xl:pt-6">
              <Button
                className="gap-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setShowMoreFilters((current) => !current)}
                size="sm"
                variant="ghost"
              >
                <Filter className="size-4" />
                更多筛选
                <ChevronDown className={`size-3.5 transition-transform duration-300 ${showMoreFilters ? "rotate-180" : ""}`} />
              </Button>
              <Button className="gap-2 text-zinc-600" onClick={handleReset} size="sm" type="button" variant="outline">
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">重置</span>
              </Button>
              <Button className="gap-2" disabled={loading} onClick={refresh} size="sm" type="button" variant="outline">
                <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                <span className="hidden sm:inline">刷新</span>
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showMoreFilters ? (
              <motion.div
                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="grid gap-4 border-t border-zinc-200/70 pt-4 sm:grid-cols-2">
                  <FilterTabs label="赛区" onChange={(value) => updateField("region", value)} options={regionOptions} value={filters.region} />
                  <FilterTabs
                    isSelected={(value) => (value === "all" ? filters.tier === "all" : selectedTiers.includes(value as MatchTier))}
                    label="赛事级别"
                    multiSelect
                    onChange={(value) => updateTier(value as "all" | MatchTier)}
                    options={TIER_FILTER_OPTIONS}
                    value={filters.tier}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <p>
              {currentGameLabel} · {selectedRegionLabel} · {selectedTierLabel} · {currentStateLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          <section className="min-w-0 space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">全部赛事</h2>
              </div>
              <Badge tone="neutral">{!error && data ? `${listMatches.length} 场` : totalLabel}</Badge>
            </div>

            {statusMessage ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{statusMessage}</div> : null}
            {isInitialLoading ? <LoadingState /> : null}
            {!data && error ? <ErrorState message={error.message} onRetry={refresh} /> : null}
            {error && data ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                本次同步失败，已保留当前列表。{error.message}
              </div>
            ) : null}
            <AnimatePresence initial={false} mode="wait">
              {data && listMatches.length > 0 ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 8 }}
                  key={listTransitionKey}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <MatchList
                    isLoadingMore={isLoadingMore}
                    matches={listMatches}
                    onNearEnd={loadFutureMatches}
                    onNearStart={loadPreviousMatches}
                    onVisibleDateChange={handleVisibleDateChange}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            {appendError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                加载更多失败，已保留当前列表。{appendError.message}
              </div>
            ) : null}
            {data ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
                <span>
                  {timelineComplete
                    ? `已显示到本周最后一天 ${timelineBounds.to}`
                    : isLoadingMore
                      ? `正在加载更多赛程，当前已显示到 ${loadedTimelineTo}`
                      : `已加载到 ${loadedTimelineTo}，继续向下滚动或点击加载到 ${timelineBounds.to}`}
                </span>
                {!timelineComplete ? (
                  <Button disabled={loading} onClick={loadFutureMatches} type="button" variant="outline">
                    <RefreshCw className={isLoadingMore ? "size-4 animate-spin" : "size-4"} />
                    加载更多
                  </Button>
                ) : null}
              </div>
            ) : null}
            {!loading && !error && data && listMatches.length === 0 ? <EmptyState message={getEmptyStateMessage(filters)} /> : null}
          </section>
        </div>

        <footer className="flex flex-col justify-between gap-2 border-t border-zinc-200 py-5 text-sm text-zinc-500 sm:flex-row">
          <span>PandaScore API · 时区 {BEIJING_TIME_ZONE}</span>
          <span>最近更新时间：{data?.updatedAt ? formatUpdatedAt(data.updatedAt) : "等待首次加载"}</span>
        </footer>
      </main>

      {showScrollToTop ? (
        <Button
          aria-label="回到顶部"
          className="fixed bottom-4 right-4 z-50 h-11 w-11 rounded-full shadow-lg shadow-zinc-950/15"
          onClick={scrollToTop}
          size="icon"
          type="button"
        >
          <ArrowUp className="size-4" />
        </Button>
      ) : null}

      {isCalendarOpen ? (
        <MatchCalendarPicker
          matchCounts={matchCounts}
          onClose={() => setIsCalendarOpen(false)}
          onSelectDate={updateSelectedDate}
          selectedDate={activeDate}
          today={today}
        />
      ) : null}
    </div>
  );
}

export default App;
