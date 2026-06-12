import type { ReactNode } from "react";
import { CalendarClock, Trophy } from "lucide-react";

type MobileHeaderProps = {
  activeDate: string;
  totalLabel: string;
  gameFilter: ReactNode;
};

export function MobileHeader({ activeDate, totalLabel, gameFilter }: MobileHeaderProps) {
  return (
    <header className="grid gap-3.5 border-b border-[var(--border-subtle)] pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--brand-soft)] text-sm font-black text-[var(--brand-primary)] ring-1 ring-[var(--brand-border)]">
            E
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-5 tracking-tight text-[var(--text-primary)]">ESPORTS CC</p>
            <p className="text-[11px] leading-4 text-[var(--text-tertiary)]">电竞赛程</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[rgba(255,255,255,0.035)] px-2.5">
            <CalendarClock className="size-3.5 shrink-0" />
            {activeDate}
          </span>
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[rgba(255,255,255,0.035)] px-2.5">
            <Trophy className="size-3.5 shrink-0" />
            {totalLabel}
          </span>
        </div>
      </div>
      {gameFilter}
    </header>
  );
}
