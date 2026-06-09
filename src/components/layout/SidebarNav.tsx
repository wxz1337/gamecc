import { CalendarDays, Gamepad2 } from "lucide-react";
import type { GameFilter } from "../../../shared/match";
import { GAME_FILTER_OPTIONS } from "../../constants/matches";
import { cn } from "../../lib/utils";

type SidebarNavProps = {
  selectedGame: GameFilter;
  onGameChange: (game: GameFilter) => void;
};

const gameIconLabels: Record<GameFilter, string> = {
  all: "全部",
  lol: "LoL",
  cs2: "CS2",
  valorant: "VAL"
};

export function SidebarNav({ selectedGame, onGameChange }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-4">
      <div className="mb-5 flex items-center gap-2 px-2">
        <div className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--brand-soft)] text-sm font-black text-[var(--brand-primary)] ring-1 ring-[var(--brand-border)]">
          E
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-[var(--text-primary)]">ESPORTS CC</p>
          <p className="text-xs text-[var(--text-tertiary)]">赛事日程</p>
        </div>
      </div>

      <nav className="grid gap-5">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] ring-1 ring-[var(--brand-border)]">
            <CalendarDays className="size-4 text-[var(--brand-primary)]" />
            赛程
          </div>
        </div>

        <div className="grid gap-1">
          <p className="px-3 text-[11px] font-semibold tracking-wide text-[var(--text-tertiary)]">赛事筛选</p>
          {GAME_FILTER_OPTIONS.map((option) => {
            const selected = option.value === selectedGame;

            return (
              <button
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-left text-sm transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                  selected
                    ? "bg-[rgba(124,92,255,0.11)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.035)] hover:text-[var(--text-primary)]"
                )}
                key={option.value}
                onClick={() => onGameChange(option.value)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-[var(--radius-xs)] text-[11px] font-bold",
                    selected ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]" : "bg-[rgba(255,255,255,0.035)] text-[var(--text-tertiary)]"
                  )}
                >
                  {option.value === "all" ? <Gamepad2 className="size-3.5" /> : gameIconLabels[option.value]}
                </span>
                <span className="min-w-0 truncate">{option.value === "all" ? "全部赛事" : option.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto border-t border-[var(--border-subtle)] px-2 pt-4 text-xs leading-5 text-[var(--text-tertiary)]">
        PandaScore 数据源
        <br />
        北京时间显示
      </div>
    </div>
  );
}
