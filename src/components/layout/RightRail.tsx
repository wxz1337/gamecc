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
    <div className="grid gap-4">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">今日概览</h2>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{activeDate}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            ["总比赛", todayMatches.length],
            ["进行中", runningCount],
            ["未开始", upcomingCount],
            ["已结束", finishedCount]
          ].map(([label, value]) => (
            <div className="border-t border-[var(--border-subtle)] pt-2" key={label}>
              <strong className="block text-sm font-semibold tabular-nums text-[var(--text-primary)]">{loading ? "-" : value}</strong>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">重点赛事</h2>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">来自当前日期已载入数据</p>
        </div>
        <div className="grid gap-1">
          {featured.length > 0 ? (
            featured.map((match) => (
              <div className="rounded-[var(--radius-xs)] px-2 py-2 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.024)]" key={match.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">{getTeamLabel(match) || match.name}</span>
                  <span className="text-right text-xs tabular-nums text-[var(--text-secondary)]">{match.displayTime}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                  {GAME_LABELS[match.game]} · {match.tournament}
                </p>
              </div>
            ))
          ) : (
            <p className="px-2 py-2 text-sm text-[var(--text-tertiary)]">
              {loading ? "赛事载入中" : "当前日期暂无已载入赛事"}
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-1 pt-3 text-xs leading-5 text-[var(--text-disabled)]">
        <p className="text-[var(--text-disabled)]">数据状态</p>
        <p className="mt-1 text-[var(--text-tertiary)]">{updatedAt ? `更新于 ${formatUpdatedAt(updatedAt)}` : "等待首次加载"}</p>
        {stale ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <span className="size-1.5 rounded-full bg-[var(--status-warning)] opacity-70" aria-hidden />
            正在展示缓存数据
          </p>
        ) : null}
        {partial ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <span className="size-1.5 rounded-full bg-[var(--status-warning)] opacity-70" aria-hidden />
            部分数据源同步失败
          </p>
        ) : null}
      </section>
    </div>
  );
}
