import { useEffect, useMemo, useState } from "react";
import { BEIJING_TIME_ZONE, addBeijingDays, getBeijingTodayDate } from "../shared/date";
import { MAX_MATCH_RANGE_DAYS, MatchPageState, buildMatchPageSearchParams, getNextViewState, parseMatchPageState, resetMatchPageState } from "./utils/matchPageState";
import { GAME_FILTER_OPTIONS, GAME_LABELS, STATUS_LABELS } from "./constants/matches";
import { useMatches } from "./hooks/useMatches";
import { EmptyState, ErrorState, LoadingState } from "./components/StatePanels";
import { MatchList } from "./components/MatchList";
import { formatUpdatedAt, getEmptyStateMessage } from "./utils/matchFormatters";

const VIEW_LABELS = {
  schedule: "赛程",
  results: "赛果"
} as const;

const STATUS_OPTIONS = [
  { label: "全部状态", value: "all" as const },
  { label: "未开始", value: "not_started" as const },
  { label: "进行中", value: "running" as const },
  { label: "已结束", value: "finished" as const },
  { label: "延期", value: "postponed" as const },
  { label: "取消", value: "cancelled" as const }
];

const SORT_OPTIONS = [
  { label: "时间升序", value: "beginAt_asc" as const },
  { label: "时间降序", value: "beginAt_desc" as const },
  { label: "状态优先", value: "status" as const },
  { label: "更新时间", value: "updatedAt_desc" as const },
  { label: "赛事名称", value: "league" as const }
];

function App() {
  const [filters, setFilters] = useState<MatchPageState>(() => parseMatchPageState(window.location.search));

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
  const tomorrow = useMemo(() => addBeijingDays(today, 1), [today]);
  const nextSevenDays = useMemo(() => addBeijingDays(today, 7), [today]);
  const recentSevenDays = useMemo(() => addBeijingDays(today, -6), [today]);

  const rangeStartMax = useMemo(() => {
    const lastValidStart = addBeijingDays(filters.to, -(MAX_MATCH_RANGE_DAYS - 1));

    return filters.to < lastValidStart ? filters.to : lastValidStart;
  }, [filters.to]);
  const rangeEndMax = useMemo(() => addBeijingDays(filters.from, MAX_MATCH_RANGE_DAYS - 1), [filters.from]);

  const updateField = <K extends keyof MatchPageState>(key: K, value: MatchPageState[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const updateFromDate = (from: string) => {
    setFilters((current) => {
      const maxTo = addBeijingDays(from, MAX_MATCH_RANGE_DAYS - 1);

      return {
        ...current,
        from,
        to: current.to < from ? from : current.to > maxTo ? maxTo : current.to
      };
    });
  };

  const updateToDate = (to: string) => {
    setFilters((current) => {
      const minFrom = addBeijingDays(to, -(MAX_MATCH_RANGE_DAYS - 1));

      return {
        ...current,
        from: current.from > to ? to : current.from < minFrom ? minFrom : current.from,
        to
      };
    });
  };

  const applyQuickRange = (nextView: MatchPageState["view"], from: string, to: string, status: MatchPageState["status"], sort: MatchPageState["sort"]) => {
    setFilters((current) => ({
      ...current,
      view: nextView,
      from,
      to,
      status,
      sort
    }));
  };

  const handleViewChange = (nextView: MatchPageState["view"]) => {
    setFilters((current) => getNextViewState(current, nextView));
  };

  const handleReset = () => {
    setFilters((current) => resetMatchPageState(current.view));
  };

  const currentRangeLabel = filters.from === filters.to ? filters.from : `${filters.from} → ${filters.to}`;
  const currentStateLabel = filters.status === "all" ? "全部状态" : STATUS_LABELS[filters.status];
  const currentGameLabel = filters.game === "all" ? "全部游戏" : GAME_LABELS[filters.game];
  const totalLabel = data ? `${data.total} 场比赛` : "等待加载";
  const statusMessage = data?.stale ? "数据可能不是最新，已展示缓存内容。" : null;
  const isResultsView = filters.view === "results";

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
              以北京时间为基准，按赛程或赛果视图查询未来赛程、历史结果与多维筛选内容，支持详情展开和 URL 恢复。
            </p>
          </div>

          <div className="hero-meta">
            <div className="meta-card">
              <span className="meta-card__label">当前视图</span>
              <strong>{VIEW_LABELS[filters.view]}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-card__label">查询范围</span>
              <strong>{currentRangeLabel}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-card__label">当前条件</span>
              <strong>{currentGameLabel} · {currentStateLabel}</strong>
            </div>
            <button className="primary-button" onClick={refresh} type="button" disabled={loading}>
              刷新
            </button>
          </div>
        </section>

        <section className="control-panel">
          <div className="control-row">
            <div className="control-group">
              <span className="control-group__label">视图</span>
              <div className="segmented-control">
                <button
                  className={filters.view === "schedule" ? "segmented-control__button is-active" : "segmented-control__button"}
                  onClick={() => handleViewChange("schedule")}
                  type="button"
                >
                  赛程
                </button>
                <button
                  className={filters.view === "results" ? "segmented-control__button is-active" : "segmented-control__button"}
                  onClick={() => handleViewChange("results")}
                  type="button"
                >
                  赛果
                </button>
              </div>
            </div>

            <div className="control-group">
              <span className="control-group__label">日期快捷项</span>
              <div className="segmented-control segmented-control--wrap">
                <button className="segmented-control__button" onClick={() => applyQuickRange("schedule", today, today, "all", "beginAt_asc")} type="button">
                  今天
                </button>
                <button className="segmented-control__button" onClick={() => applyQuickRange("schedule", tomorrow, tomorrow, "all", "beginAt_asc")} type="button">
                  明天
                </button>
                <button className="segmented-control__button" onClick={() => applyQuickRange("schedule", today, nextSevenDays, "all", "beginAt_asc")} type="button">
                  未来 7 天
                </button>
                <button className="segmented-control__button" onClick={() => applyQuickRange("results", recentSevenDays, today, "finished", "beginAt_desc")} type="button">
                  最近 7 天
                </button>
                <button className="segmented-control__button" onClick={() => applyQuickRange("results", recentSevenDays, today, "finished", "beginAt_desc")} type="button">
                  过去比赛
                </button>
                <button className="segmented-control__button" onClick={() => applyQuickRange("schedule", today, nextSevenDays, "all", "beginAt_asc")} type="button">
                  未来赛程
                </button>
              </div>
            </div>
          </div>

          <div className="control-grid">
            <label className="field-group">
              <span className="control-group__label">开始日期</span>
              <input
                className="field-input"
                min={rangeStartMax}
                max={filters.to}
                onChange={(event) => updateFromDate(event.target.value)}
                type="date"
                value={filters.from}
              />
            </label>

            <label className="field-group">
              <span className="control-group__label">结束日期</span>
              <input
                className="field-input"
                min={filters.from}
                max={rangeEndMax}
                onChange={(event) => updateToDate(event.target.value)}
                type="date"
                value={filters.to}
              />
            </label>

            <label className="field-group">
              <span className="control-group__label">游戏</span>
              <select className="field-input" onChange={(event) => updateField("game", event.target.value as MatchPageState["game"])} value={filters.game}>
                {GAME_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="control-group__label">状态</span>
              <select className="field-input" onChange={(event) => updateField("status", event.target.value as MatchPageState["status"])} value={filters.status}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="control-group__label">排序</span>
              <select className="field-input" onChange={(event) => updateField("sort", event.target.value as MatchPageState["sort"])} value={filters.sort}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group field-group--wide">
              <span className="control-group__label">全局搜索</span>
              <input
                className="field-input"
                onChange={(event) => updateField("query", event.target.value)}
                placeholder="队伍、赛事、联赛、游戏展示名"
                type="search"
                value={filters.query}
              />
            </label>

            <label className="field-group">
              <span className="control-group__label">赛事</span>
              <input className="field-input" onChange={(event) => updateField("league", event.target.value)} placeholder="LPL / ESL / VCT" type="text" value={filters.league} />
            </label>

            <label className="field-group">
              <span className="control-group__label">队伍</span>
              <input className="field-input" onChange={(event) => updateField("team", event.target.value)} placeholder="EDG / BLG / Vitality" type="text" value={filters.team} />
            </label>

            <label className="field-group">
              <span className="control-group__label">赛区 / 国家</span>
              <input className="field-input" onChange={(event) => updateField("region", event.target.value)} placeholder="CN / KR / Pacific" type="text" value={filters.region} />
            </label>

            <label className="field-group">
              <span className="control-group__label">阶段</span>
              <input className="field-input" onChange={(event) => updateField("stage", event.target.value)} placeholder="小组赛 / 季后赛 / 决赛" type="text" value={filters.stage} />
            </label>
          </div>

          <div className="control-actions">
            <button className="secondary-button" onClick={handleReset} type="button">
              清空筛选
            </button>
            <div className="control-caption">
              <span>{isResultsView ? "赛果默认最近 7 天、已结束、时间降序。" : "赛程默认今天到未来 7 天、时间升序。"}</span>
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
    </div>
  );
}

export default App;
