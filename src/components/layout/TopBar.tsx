import { CalendarDays, Clock3, RefreshCw, Trophy } from "lucide-react";
import { Button } from "../ui/button";

type TopBarProps = {
  activeDate: string;
  totalLabel: string;
  timezoneLabel: string;
  loading: boolean;
  onOpenCalendar: () => void;
  onRefresh: () => void;
};

export function TopBar({ activeDate, totalLabel, timezoneLabel, loading, onOpenCalendar, onRefresh }: TopBarProps) {
  return (
    <header className="flex min-h-[var(--topbar-height)] flex-col justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[rgba(13,19,30,0.72)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">电竞赛程</h1>
        <p className="mt-0.5 truncate text-sm text-[var(--text-tertiary)]">LoL、CS2、VALORANT 赛程与结果</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="hidden items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.026)] px-3 py-1.5 text-[var(--text-tertiary)] sm:flex">
          <Clock3 className="size-3.5" />
          <span>{timezoneLabel}</span>
        </div>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.035)] px-3 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          onClick={onOpenCalendar}
          type="button"
        >
          <CalendarDays className="size-3.5" />
          <span className="tabular-nums">{activeDate}</span>
        </button>
        <div className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.035)] px-3 text-[var(--text-secondary)]">
          <Trophy className="size-3.5" />
          <span>{totalLabel}</span>
        </div>
        <Button disabled={loading} onClick={onRefresh} size="sm" type="button" variant="outline">
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          <span className="hidden sm:inline">刷新</span>
        </Button>
      </div>
    </header>
  );
}
