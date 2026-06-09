import { Clock3, RefreshCw, Trophy } from "lucide-react";
import { Button } from "../ui/button";

type TopBarProps = {
  totalLabel: string;
  timezoneLabel: string;
  loading: boolean;
  onRefresh: () => void;
};

export function TopBar({ totalLabel, timezoneLabel, loading, onRefresh }: TopBarProps) {
  return (
    <header
      className="flex min-h-[52px] flex-col justify-center gap-2 border-b border-[var(--border-subtle)] px-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-0"
      data-topbar
    >
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">电竞赛程</h1>
        <p className="truncate text-xs text-[var(--text-tertiary)]">LoL、CS2、VALORANT 赛程与结果</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <div className="hidden h-7 items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.022)] px-2.5 text-[var(--text-tertiary)] sm:flex">
          <Clock3 className="size-3.5" />
          <span>{timezoneLabel}</span>
        </div>
        <div className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.03)] px-2.5 text-[var(--text-secondary)]">
          <Trophy className="size-3.5" />
          <span>{totalLabel}</span>
        </div>
        <Button className="h-7 px-3" disabled={loading} onClick={onRefresh} size="sm" type="button" variant="outline">
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          <span className="hidden sm:inline">刷新</span>
        </Button>
      </div>
    </header>
  );
}
