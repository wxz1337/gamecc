import type { Match } from "../../../shared/match";
import { GAME_LABELS } from "../../constants/matches";
import { formatUpdatedAt } from "../../utils/matchFormatters";

type RightRailProps = {
  activeDate: string;
  matches: Match[];
  loading: boolean;
  updatedAt?: string | null;
  stale?: boolean;
  partial?: boolean;
};

function getTeamLabel(match: Match) {
  return match.teams
    .slice(0, 2)
    .map((team) => team.acronym || team.name)
    .filter(Boolean)
    .join(" vs ");
}

export function RightRail({ activeDate, matches, loading, updatedAt, stale = false, partial = false }: RightRailProps) {
  const todayMatches = matches.filter((match) => match.displayDate === activeDate);
  const runningCount = todayMatches.filter((match) => match.status === "running").length;
  const upcomingCount = todayMatches.filter((match) => match.status === "not_started").length;
  const finishedCount = todayMatches.filter((match) => match.status === "finished").length;
  const featured = todayMatches.slice(0, 3);

  return (
    <div className="grid gap-3">
      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[rgba(13,19,30,0.64)] p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">今日概览</h2>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{activeDate}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["总比赛", todayMatches.length],
            ["进行中", runningCount],
            ["未开始", upcomingCount],
            ["已结束", finishedCount]
          ].map(([label, value]) => (
            <div className="rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.026)] px-3 py-2" key={label}>
              <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
              <strong className="mt-1 block text-lg tabular-nums text-[var(--text-primary)]">{loading ? "-" : value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[rgba(13,19,30,0.5)] p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">重点赛事</h2>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">来自当前日期已载入数据</p>
        </div>
        <div className="grid gap-2">
          {featured.length > 0 ? (
            featured.map((match) => (
              <div className="rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.022)] px-3 py-2" key={match.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">{getTeamLabel(match) || match.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--text-tertiary)]">{match.displayTime}</span>
                </div>
                <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                  {GAME_LABELS[match.game]} · {match.tournament}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.022)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
              {loading ? "赛事载入中" : "当前日期暂无已载入赛事"}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[rgba(13,19,30,0.42)] p-4 text-xs leading-5 text-[var(--text-tertiary)]">
        <p>数据状态</p>
        <p className="mt-1 text-[var(--text-secondary)]">{updatedAt ? `更新于 ${formatUpdatedAt(updatedAt)}` : "等待首次加载"}</p>
        {stale ? <p className="mt-1 text-[var(--status-warning)]">正在展示缓存数据</p> : null}
        {partial ? <p className="mt-1 text-[var(--status-warning)]">部分数据源同步失败</p> : null}
      </section>
    </div>
  );
}
