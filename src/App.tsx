import { useEffect, useMemo, useState } from "react";
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
import type { MatchTier } from "../shared/match";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
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
  const totalLabel = data ? `${data.total} 场比赛` : "等待加载";
  const statusMessage = data?.stale ? "数据可能不是最新，已展示缓存内容。" : null;
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
    <div className="page-shell">
      <div className="page-backdrop page-backdrop--one" />
      <div className="page-backdrop page-backdrop--two" />

      <main className="app-shell">
        <section className="hero-panel hero-panel--compact">
          <div>
            <p className="eyebrow">PandaScore 赛事查询工具</p>
            <h1>电竞赛程聚合</h1>
            <p className="hero-copy">
              以北京时间为基准，按游戏、赛区、赛事级别和比赛状态查看每日电竞比赛。
            </p>
          </div>

          <div className="hero-meta">
            <div className="meta-card">
              <span className="meta-card__label">当前日期</span>
              <strong>{filters.from}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-card__label">赛事筛选</span>
              <strong>{currentGameLabel} · {selectedRegionLabel}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-card__label">当前条件</span>
              <strong>{selectedTierLabel} · {currentStateLabel}</strong>
            </div>
            <button className="primary-button" onClick={refresh} type="button" disabled={loading}>
              刷新
            </button>
          </div>
        </section>

        <section className="control-panel calendar-panel">
          <div className="calendar-filters">
            <div className="filter-line">
              <span className="control-group__label">游戏</span>
              <div className="segmented-control">
                {GAME_FILTER_OPTIONS.map((option) => (
                  <button
                    className={filters.game === option.value ? "segmented-control__button is-active" : "segmented-control__button"}
                    key={option.value}
                    onClick={() => updateGame(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-line">
              <span className="control-group__label">赛区</span>
              <div className="segmented-control">
                {regionOptions.map((option) => (
                  <button
                    className={filters.region === option.value ? "segmented-control__button is-active" : "segmented-control__button"}
                    key={option.label}
                    onClick={() => updateField("region", option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-line filter-line--split">
              <div>
                <span className="control-group__label">赛事级别</span>
                <div className="segmented-control">
                  {TIER_FILTER_OPTIONS.map((option) => (
                    <button
                      className={
                        option.value === "all"
                          ? filters.tier === "all" ? "segmented-control__button is-active" : "segmented-control__button"
                          : selectedTiers.includes(option.value) ? "segmented-control__button is-active" : "segmented-control__button"
                      }
                      key={option.value}
                      onClick={() => updateTier(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="control-group__label">状态</span>
                <div className="segmented-control">
                  {MATCH_STATUS_FILTER_OPTIONS.map((option) => (
                    <button
                      className={filters.status === option.value ? "segmented-control__button is-active" : "segmented-control__button"}
                      key={option.value}
                      onClick={() => updateField("status", option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="week-calendar">
            <button className="week-calendar__arrow" onClick={() => moveWeek(-7)} type="button" aria-label="上一周">
              ‹
            </button>

            <div className="week-calendar__days">
              {weekDates.map((date) => {
                const day = new Date(`${date}T00:00:00.000Z`);
                const weekday = WEEKDAY_LABELS[day.getUTCDay()];
                const dayLabel = date.slice(5).replace("-", ".");
                const isSelected = filters.from === date;

                return (
                  <button
                    className={isSelected ? "day-button is-active" : "day-button"}
                    key={date}
                    onClick={() => updateSelectedDate(date)}
                    type="button"
                  >
                    <strong>{dayLabel}</strong>
                    <span>{date === today ? "今天" : weekday}</span>
                  </button>
                );
              })}
            </div>

            <button className="week-calendar__arrow" onClick={() => moveWeek(7)} type="button" aria-label="下一周">
              ›
            </button>

            <div className="calendar-picker-control">
              <button
                className={isCalendarOpen ? "calendar-picker-trigger is-active" : "calendar-picker-trigger"}
                onClick={() => setIsCalendarOpen((current) => !current)}
                type="button"
              >
                <span aria-hidden="true">▣</span>
                选择日期
              </button>
            </div>
          </div>

          <div className="control-actions">
            <button className="secondary-button" onClick={handleReset} type="button">
              重置
            </button>
            <div className="control-caption">
              <span>默认显示今天 · 全部游戏 · 全部赛区 · PandaScore S级/A级 · 全部比赛。</span>
            </div>
          </div>
        </section>

        {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}

        {!loading && !error && data ? (
          <div className="status-banner status-banner--subtle">
            {source === "mock"
              ? "当前显示本地 mock 数据，配置 PandaScore token 后会自动切换到真实赛程。"
              : `当前显示实时赛程数据，已载入 ${totalLabel}。`}
          </div>
        ) : null}

        <section className="content-panel">
          {loading ? <LoadingState /> : null}

          {!loading && error ? <ErrorState message={error.message} onRetry={refresh} /> : null}

          {!loading && !error && data && data.matches.length > 0 ? <MatchList matches={data.matches} /> : null}

          {!loading && !error && data && data.matches.length === 0 ? <EmptyState message={getEmptyStateMessage(filters)} /> : null}
        </section>

        <footer className="footer-panel">
          <div>
            <p className="footer-panel__label">数据来源</p>
            <p className="footer-panel__copy">PandaScore API · 时区 {BEIJING_TIME_ZONE}</p>
          </div>

          <div>
            <p className="footer-panel__label">最近更新时间</p>
            <p className="footer-panel__copy">{data?.updatedAt ? formatUpdatedAt(data.updatedAt) : "等待首次加载"}</p>
          </div>
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
