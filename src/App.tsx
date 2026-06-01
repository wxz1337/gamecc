import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUp, CalendarClock, ChevronDown, Database, Radio, RefreshCw, RotateCcw } from "lucide-react";
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
  MATCH_STATUS_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => hasAdvancedFilters(initialTimelineState));

  useEffect(() => {
    const onPopState = () => {
      const nextState = getInitialTimelineState();
      setFilters(nextState);
      setActiveDate(nextState.from);
      setTimelineAnchorDate(nextState.from);
      setShowAdvancedFilters(hasAdvancedFilters(nextState));
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

  const { data, loading, error, appendError, source, refresh, appendMatches } = useMatches({ filters });
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
  const selectedTiers = getSelectedTiers(filters.tier);
  const totalLabel = data ? `${data.total} 场` : loading ? "同步中" : "未载入";
  const headerCountLabel = data ? `${data.total} 场` : totalLabel;
  const liveCount = data?.matches.filter((match) => match.status === "running").length ?? 0;
  const selectedDayCount = data?.matches.filter((match) => match.displayDate === activeDate).length ?? 0;
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
  const listStatusMessage = data
    ? loading
      ? `正在同步，先显示已缓存赛程。`
      : data.stale
        ? "已展示缓存内容，可能非最新。"
        : data.partial
          ? "部分数据源同步失败，先显示可用赛程。"
          : source === "mock"
            ? "当前为本地 mock 数据。"
            : `当前为实时赛程，已载入 ${data.total} 场。`
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
    setShowAdvancedFilters(false);
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
    <div className="app-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden rounded-3xl px-4 py-3 sm:px-5 sm:py-4"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge className="mb-2 h-7 px-3 uppercase tracking-[0.16em]" tone="neutral">
                <Radio className={loading ? "size-3.5 animate-pulse text-emerald-600" : "size-3.5 text-emerald-600"} />
                GameCC Live Ops
              </Badge>
              <h1 className="font-display max-w-3xl text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                电竞赛程工具页
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-600">
                按北京时间快速扫日期、状态和比分，先找直播中和重点场，再决定要不要展开细节。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 px-3" tone="neutral">
                <CalendarClock className="size-3.5" />
                日期 {activeDate}
              </Badge>
              <Badge className="h-8 px-3" tone="neutral">
                <Database className="size-3.5" />
                已载入 {headerCountLabel}
              </Badge>
              <Badge className="h-8 px-3" tone="green">
                <Activity className="size-3.5" />
                进行中 {liveCount} 场
              </Badge>
              <Badge className="h-8 px-3" tone="neutral">
                当前日期已载入 {selectedDayCount} 场
              </Badge>
              <Badge className="h-8 px-3" tone="neutral">
                数据源：{source === "mock" ? "Mock" : "PandaScore"}
              </Badge>
              <Button disabled={loading} onClick={refresh} type="button">
                <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
                刷新赛程
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="glass-panel space-y-3 rounded-3xl p-3 sm:p-4">
          <div className="rounded-2xl border border-stone-200 bg-white/58 p-2 shadow-inner shadow-stone-900/[0.025]">
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

          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:items-center">
            <FilterTabs
              inlineLabel
              label="游戏"
              onChange={updateGame}
              options={GAME_FILTER_OPTIONS}
              trailingSlot={
                <>
                  <Button
                    aria-expanded={showAdvancedFilters}
                    className={
                      showAdvancedFilters
                        ? "h-10 rounded-xl bg-[#172033] px-3 text-white shadow-[0_10px_24px_rgba(23,32,51,0.14)] hover:bg-[#273653] hover:text-white"
                        : "h-10 rounded-xl px-3 text-slate-600 shadow-none hover:bg-white hover:text-slate-950"
                    }
                    onClick={() => setShowAdvancedFilters((current) => !current)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    筛选
                    <ChevronDown className={showAdvancedFilters ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"} />
                  </Button>
                  <Button
                    className="h-10 rounded-xl px-3 text-slate-600 shadow-none hover:bg-white hover:text-slate-950"
                    onClick={handleReset}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw className="size-4" />
                    重置
                  </Button>
                </>
              }
              value={filters.game}
            />
            <FilterTabs
              inlineLabel
              label="状态"
              onChange={(value) => updateStatus(value as MatchPageState["status"])}
              options={MATCH_STATUS_FILTER_OPTIONS}
              shrinkWrap
              value={filters.status}
            />
          </div>

          <AnimatePresence initial={false}>
            {showAdvancedFilters ? (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="grid gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white/54 px-3 py-3 shadow-inner shadow-stone-900/[0.025] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <FilterTabs
                  label="赛区"
                  onChange={(value) => updateField("region", value)}
                  options={regionOptions}
                  value={filters.region}
                  wrap
                />
                <FilterTabs
                  isSelected={(value) => (value === "all" ? filters.tier === "all" : selectedTiers.includes(value as MatchTier))}
                  label="赛事级别"
                  multiSelect
                  onChange={(value) => updateTier(value as "all" | MatchTier)}
                  options={TIER_FILTER_OPTIONS}
                  value={filters.tier}
                  wrap
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="space-y-4">
          <div className="glass-panel flex flex-col gap-3 rounded-3xl px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Match List</p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">全部赛事</h2>
                {listStatusMessage ? <span className="text-xs font-medium text-slate-500">{listStatusMessage}</span> : null}
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs font-medium text-slate-500 sm:items-end">
              {data ? <span>时间线 {filters.from} 至 {loadedTimelineTo}</span> : null}
              <Badge tone="neutral">{!error && data ? `${listMatches.length} 场` : totalLabel}</Badge>
            </div>
          </div>

          {isInitialLoading ? <LoadingState /> : null}
          {!data && error ? <ErrorState message={error.message} onRetry={refresh} /> : null}
          {error && data ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
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
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              加载更多失败，已保留当前列表。{appendError.message}
            </div>
          ) : null}
          {data ? (
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600">
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

        <footer className="flex flex-col justify-between gap-2 border-t border-stone-300/60 py-5 text-sm font-medium text-slate-500 sm:flex-row">
          <span>PandaScore API · 时区 {BEIJING_TIME_ZONE}</span>
          <span>最近更新时间：{data?.updatedAt ? formatUpdatedAt(data.updatedAt) : "等待首次加载"}</span>
        </footer>
      </main>

      {showScrollToTop ? (
        <Button
          aria-label="回到顶部"
          className="fixed bottom-4 right-4 z-50 shadow-[0_18px_42px_rgba(23,32,51,0.18)]"
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
