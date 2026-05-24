import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Database, RefreshCw, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { BEIJING_TIME_ZONE, addBeijingDays, getBeijingTodayDate, getBeijingWeekDates, isValidDateString } from "../shared/date";
import { MatchPageState, buildMatchPageSearchParams, parseMatchPageState, resetMatchPageState } from "./utils/matchPageState";
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
import { Card } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { FilterTabs } from "./components/FilterTabs";
import { WeekStrip } from "./components/WeekStrip";
import { FeaturedMatches } from "./components/FeaturedMatches";
import type { MatchTier } from "../shared/match";

const TIER_ORDER: MatchTier[] = ["S", "A", "B", "C"];

function getSelectedTiers(tier: MatchPageState["tier"]): MatchTier[] {
  if (tier === "all") {
    return [];
  }

  return TIER_ORDER.filter((value) => tier.split(",").includes(value));
}

function formatTierLabel(tier: MatchPageState["tier"]): string {
  if (tier === "all") {
    return "全部级别";
  }

  const selectedTiers = getSelectedTiers(tier);

  return selectedTiers.length > 0 ? selectedTiers.map((value) => `${value}级`).join(" / ") : "S级 / A级";
}

function App() {
  const [filters, setFilters] = useState<MatchPageState>(() => parseMatchPageState(window.location.search));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setFilters(parseMatchPageState(window.location.search));
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const nextSearch = buildMatchPageSearchParams(filters).toString();
    const currentSearch = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;

    if (nextSearch !== currentSearch) {
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, [filters]);

  const { data, loading, error, source, refresh } = useMatches({ filters });

  const today = useMemo(() => getBeijingTodayDate(), []);
  const weekDates = useMemo(() => getBeijingWeekDates(filters.from), [filters.from]);
  const regionOptions = REGION_FILTER_OPTIONS[filters.game];
  const selectedRegionLabel = regionOptions.find((option) => option.value === filters.region)?.label ?? "自定义赛区";
  const selectedTierLabel = formatTierLabel(filters.tier);
  const selectedTiers = getSelectedTiers(filters.tier);
  const currentStateLabel = filters.status === "all" ? "全部比赛" : STATUS_LABELS[filters.status];
  const currentGameLabel = filters.game === "all" ? "全部游戏" : GAME_LABELS[filters.game];
  const totalLabel = data ? `${data.total} 场` : loading ? "同步中" : "未载入";
  const runningCount = data?.matches.filter((match) => match.status === "running").length ?? 0;
  const statusMessage = data?.stale ? "数据可能不是最新，已展示缓存内容。" : null;
  const featuredTitle = filters.from === today ? "今日重点" : "当日重点";
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
    setFilters((current) => ({
      ...current,
      from: date,
      to: date
    }));
  };

  const moveWeek = (days: number) => {
    updateSelectedDate(addBeijingDays(filters.from, days));
  };

  const handleReset = () => {
    setFilters(resetMatchPageState("schedule"));
  };

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-zinc-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="min-w-0">
            <Badge className="mb-3" tone="dark">
              <Sparkles className="size-3.5" />
              个人观赛面板
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">电竞赛程聚合</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              以北京时间查看每日电竞比赛，按游戏、赛区、赛事级别和状态快速收敛到今天想看的内容。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[500px]">
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                <CalendarClock className="size-4" />
                当前日期
              </p>
              <strong className="mt-2 block text-lg tabular-nums text-zinc-950">{filters.from}</strong>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Trophy className="size-4" />
                已载入
              </p>
              <strong className="mt-2 block text-lg text-zinc-950">{totalLabel}</strong>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Database className="size-4" />
                进行中
              </p>
              <strong className="mt-2 block text-lg text-zinc-950">{runningCount} 场</strong>
            </Card>
          </div>
        </motion.section>

        <Card className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <FilterTabs label="游戏" onChange={updateGame} options={GAME_FILTER_OPTIONS} value={filters.game} />
            <FilterTabs label="赛区" onChange={(value) => updateField("region", value)} options={regionOptions} value={filters.region} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FilterTabs
              isSelected={(value) => (value === "all" ? filters.tier === "all" : selectedTiers.includes(value as MatchTier))}
              label="赛事级别"
              multiSelect
              onChange={(value) => updateTier(value as "all" | MatchTier)}
              options={TIER_FILTER_OPTIONS}
              value={filters.tier}
            />
            <FilterTabs
              label="状态"
              onChange={(value) => updateField("status", value)}
              options={MATCH_STATUS_FILTER_OPTIONS}
              value={filters.status}
            />
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <WeekStrip
              dates={weekDates}
              isCalendarOpen={isCalendarOpen}
              onMoveWeek={moveWeek}
              onOpenCalendar={() => setIsCalendarOpen((current) => !current)}
              onSelectDate={updateSelectedDate}
              selectedDate={filters.from}
              today={today}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
            <p className="text-sm text-zinc-600">
              {currentGameLabel} · {selectedRegionLabel} · {selectedTierLabel} · {currentStateLabel}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleReset} type="button" variant="outline">
                <RotateCcw className="size-4" />
                重置
              </Button>
              <Button disabled={loading} onClick={refresh} type="button">
                <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
                刷新
              </Button>
            </div>
          </div>
        </Card>

        {statusMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{statusMessage}</div>
        ) : null}

        {!loading && !error && data ? (
          <div className="rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
            {source === "mock"
              ? "当前显示本地 mock 数据，配置 PandaScore token 后会自动切换到真实赛程。"
              : `当前显示实时赛程数据，已载入 ${data.total} 场比赛。`}
          </div>
        ) : null}

        {!loading && !error && data && data.matches.length > 0 ? <FeaturedMatches matches={data.matches} title={featuredTitle} /> : null}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Match List</p>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">全部赛事</h2>
            </div>
            <Badge tone="neutral">{totalLabel}</Badge>
          </div>

          {loading ? <LoadingState /> : null}
          {!loading && error ? <ErrorState message={error.message} onRetry={refresh} /> : null}
          {!loading && !error && data && data.matches.length > 0 ? <MatchList matches={data.matches} /> : null}
          {!loading && !error && data && data.matches.length === 0 ? <EmptyState message={getEmptyStateMessage(filters)} /> : null}
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t border-zinc-200 py-5 text-sm text-zinc-500 sm:flex-row">
          <span>PandaScore API · 时区 {BEIJING_TIME_ZONE}</span>
          <span>最近更新时间：{data?.updatedAt ? formatUpdatedAt(data.updatedAt) : "等待首次加载"}</span>
        </footer>
      </main>

      {isCalendarOpen ? (
        <MatchCalendarPicker
          matchCounts={matchCounts}
          onClose={() => setIsCalendarOpen(false)}
          onSelectDate={updateSelectedDate}
          selectedDate={filters.from}
          today={today}
        />
      ) : null}
    </div>
  );
}

export default App;
