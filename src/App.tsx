import { useMemo, useState } from "react";
import { BEIJING_TIME_ZONE } from "../shared/date";
import type { GameFilter } from "../shared/match";
import { MatchList } from "./components/MatchList";
import { EmptyState, ErrorState, LoadingState } from "./components/StatePanels";
import { GAME_FILTER_OPTIONS } from "./constants/matches";
import { useMatches } from "./hooks/useMatches";
import { getBeijingTodayDateString, getBeijingTomorrowDateString } from "./utils/date";
import { formatUpdatedAt, getEmptyStateMessage } from "./utils/matchFormatters";

function App() {
  const [date, setDate] = useState(() => getBeijingTodayDateString());
  const [game, setGame] = useState<GameFilter>("all");

  const today = useMemo(() => getBeijingTodayDateString(), []);
  const tomorrow = useMemo(() => getBeijingTomorrowDateString(), []);

  const { data, loading, error, source, refresh } = useMatches({
    date,
    game
  });

  const statusMessage = data?.stale ? "数据可能不是最新，已展示缓存内容。" : null;

  return (
    <div className="page-shell">
      <div className="page-backdrop page-backdrop--one" />
      <div className="page-backdrop page-backdrop--two" />

      <main className="app-shell">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">PandaScore 赛程聚合</p>
            <h1>电竞赛程聚合</h1>
            <p className="hero-copy">
              集中查看北京时间今天与明天的 CS2、VALORANT、LoL 赛程，按开赛时间顺序扫一眼就能安排观赛。
            </p>
          </div>

          <div className="hero-meta">
            <div className="meta-card">
              <span className="meta-card__label">当前日期</span>
              <strong>{date}</strong>
            </div>
            <button className="primary-button" onClick={refresh} type="button" disabled={loading}>
              刷新
            </button>
          </div>
        </section>

        <section className="control-panel">
          <div className="control-group">
            <span className="control-group__label">日期</span>
            <div className="segmented-control">
              <button
                className={date === today ? "segmented-control__button is-active" : "segmented-control__button"}
                onClick={() => setDate(today)}
                type="button"
              >
                今天
              </button>
              <button
                className={date === tomorrow ? "segmented-control__button is-active" : "segmented-control__button"}
                onClick={() => setDate(tomorrow)}
                type="button"
              >
                明天
              </button>
            </div>
          </div>

          <div className="control-group">
            <span className="control-group__label">游戏</span>
            <div className="segmented-control segmented-control--games">
              {GAME_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={game === option.value ? "segmented-control__button is-active" : "segmented-control__button"}
                  onClick={() => setGame(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}

        {!loading && !error && data ? (
          <div className="status-banner status-banner--subtle">
            {source === "mock"
              ? "当前显示本地 mock 数据，配置 PandaScore token 后会自动切换到真实赛程。"
              : "当前显示实时赛程数据。"}
          </div>
        ) : null}

        <section className="content-panel">
          {loading ? <LoadingState /> : null}

          {!loading && error ? (
            <ErrorState message={error.message} onRetry={refresh} />
          ) : null}

          {!loading && !error && data && data.matches.length > 0 ? <MatchList matches={data.matches} /> : null}

          {!loading && !error && data && data.matches.length === 0 ? (
            <EmptyState message={getEmptyStateMessage(game)} />
          ) : null}
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
