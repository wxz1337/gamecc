import { motion } from "framer-motion";
import { Sparkles, CalendarClock, Trophy, Activity } from "lucide-react";

interface DashboardHeroProps {
  activeDate: string;
  totalLabel: string;
  runningCount: number;
}

export function DashboardHero({ activeDate, totalLabel, runningCount }: DashboardHeroProps) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          <Sparkles className="size-5 text-[var(--brand-primary)]" />
          电竞赛程
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
          <CalendarClock className="size-3.5" />
          <span className="tabular-nums font-medium">{activeDate}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
          <Trophy className="size-3.5" />
          <span className="font-medium">{totalLabel}</span>
        </div>
        {runningCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(255,77,94,0.24)] bg-[rgba(255,77,94,0.1)] px-3 py-1.5 text-[var(--status-live)]">
            <Activity className="size-3.5 animate-pulse" />
            <span className="font-medium">{runningCount} 场进行中</span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
