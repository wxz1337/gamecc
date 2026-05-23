import { useMemo, useState } from "react";
import { BEIJING_TIME_ZONE } from "../shared/date";
import { GameFilter, Match, MatchStatus } from "../shared/match";
import { useMatches } from "./hooks/useMatches";
import { getBeijingTodayDateString, getBeijingTomorrowDateString } from "./utils/date";

const GAME_FILTER_OPTIONS: Array<{ label: string; value: GameFilter }> = [
  { label: "全部", value: "all" },
  { label: "CS2", value: "cs2" },
  { label: "VALORANT", value: "valorant" },
  { label: "LoL", value: "lol" }
];

const STATUS_LABELS: Record<MatchStatus, string> = {
  not_started: "未开始",
  running: "进行中",
  finished: "已结束",
  postponed: "已延期",
  cancelled: "已取消"
};

const GAME_LABELS: Record<Exclude<GameFilter, "all">, string> = {
  cs2: "CS2",
  valorant: "VALORANT",
  lol: "LoL"
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "更新时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTeams(match: Match): string {
  return match.teams
    .map((team) => team.name.trim())
    .filter(Boolean)
    .join(" vs ");
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
}

function getTeamScore(match: Match, teamId: string | null | undefined): number | null {
  if (!teamId || !match.score) {
    return null;
  }

  return match.score.find((score) => score.teamId === teamId)?.score ?? null;
}

function getWinnerLabel(match: Match): string | null {
  if (match.draw) {
    return "平局";
  }

  return match.winnerName ?? null;
}

function formatTournamentMeta(match: Match): string[] {
  return [
    match.tournamentCountry,
    match.tournamentRegion && match.tournamentRegion !== match.tournamentCountry ? match.tournamentRegion : null,
    match.tournamentTier ? `${match.tournamentTier.toUpperCase()} 级` : null,
    match.hasBracket ? "淘汰赛签表" : null,
    match.tournamentPrizepool ? `奖金 ${match.tournamentPrizepool}` : null
  ].filter((item): item is string => Boolean(item));
}

function getEmptyStateMessage(game: GameFilter): string {
  return game === "all" ? "今天暂无已收录赛程。" : "当前筛选条件下没有比赛。";
}

function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>;
}

function MatchCard({ match }: { match: Match }) {
  const gameLabel = GAME_LABELS[match.game];
  const teams = formatTeams(match);
  const winnerLabel = getWinnerLabel(match);
  const tournamentMeta = formatTournamentMeta(match);
  const visibleGames = match.games?.filter((game) => game.position != null).slice(0, 5) ?? [];
  const scheduleMeta = [
    match.displayEndTime ? `结束 ${match.displayEndTime}` : null,
    match.rescheduled && match.displayOriginalTime ? `原定 ${match.displayOriginalTime}` : null,
    match.forfeit ? "弃权" : null,
    match.detailedStatsAvailable ? "赛后统计" : null
  ].filter((item): item is string => Boolean(item));

  return (
    <article className="match-card">
      <div className="match-card__time-block">
        <p className="match-card__time">{match.displayTime}</p>
        <p className="match-card__date">{match.displayDate}</p>
      </div>

      <div className="match-card__body">
        <div className="match-card__topline">
          <span className="game-pill">{gameLabel}</span>
          <StatusBadge status={match.status} />
          {match.bestOf ? <span className="bo-pill">BO{match.bestOf}</span> : null}
        </div>

        <h3 className="match-card__tournament">{match.tournament}</h3>
        <p className="match-card__league">{match.league}</p>
        {match.name ? <p className="match-card__round">{match.name}</p> : null}

        <div className="scoreboard" aria-label={teams}>
          {match.teams.map((team) => {
            const score = getTeamScore(match, team.id);
            const isWinner = team.id != null && match.winnerTeamId === team.id;
            const logo = team.darkModeImageUrl || team.imageUrl;

            return (
              <div className={isWinner ? "scoreboard__team is-winner" : "scoreboard__team"} key={`${match.id}-${team.id ?? team.name}`}>
                {logo ? <img alt="" className="scoreboard__logo" src={logo} /> : <span className="scoreboard__logo scoreboard__logo--empty" />}
                <div className="scoreboard__name-block">
                  <span className="scoreboard__name">{team.acronym || team.name}</span>
                  {team.location ? <span className="scoreboard__location">{team.location}</span> : null}
                </div>
                <strong className="scoreboard__score">{score ?? "-"}</strong>
              </div>
            );
          })}
        </div>

        {winnerLabel ? <p className="match-card__winner">胜者：{winnerLabel}</p> : null}

        {scheduleMeta.length > 0 || tournamentMeta.length > 0 ? (
          <div className="match-card__meta-grid">
            {[...scheduleMeta, ...tournamentMeta].map((item) => (
              <span className="meta-chip" key={item}>{item}</span>
            ))}
          </div>
        ) : null}

        {visibleGames.length > 0 ? (
          <div className="game-breakdown">
            {visibleGames.map((singleGame) => {
              const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);
              const duration = formatDuration(singleGame.lengthSeconds);

              return (
                <span className="game-chip" key={singleGame.id}>
                  G{singleGame.position}
                  {winner ? ` ${winner.acronym || winner.name}` : ""}
                  {duration ? ` · ${duration}` : ""}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MatchList({ matches }: { matches: Match[] }) {
  return (
    <div className="match-list">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-panel state-panel--loading">
      <div className="loading-ring" />
      <div>
        <p className="state-panel__title">正在拉取赛程</p>
        <p className="state-panel__copy">正在同步北京时间下的比赛列表。</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-panel state-panel--error">
      <div>
        <p className="state-panel__title">赛程数据暂时获取失败</p>
        <p className="state-panel__copy">{message}</p>
      </div>
      <button className="primary-button" onClick={onRetry} type="button">
        重试
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-panel state-panel--empty">
      <p className="state-panel__title">暂无比赛</p>
      <p className="state-panel__copy">{message}</p>
    </div>
  );
}

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
