import { motion } from "framer-motion";
import { Radio, Trophy } from "lucide-react";
import type { Match } from "../../shared/match";
import { GAME_LABELS } from "../constants/matches";
import { getTeamScore } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../lib/utils";
import { TeamLogo } from "./TeamLogo";

type FeaturedMatchesProps = {
  matches: Match[];
  title?: string;
};

function normalizeTier(tier: string | null | undefined) {
  return tier?.trim().toUpperCase();
}

function getPriority(match: Match) {
  if (match.status === "running") {
    return 0;
  }

  if (normalizeTier(match.tournamentTier) === "S") {
    return 1;
  }

  if (normalizeTier(match.tournamentTier) === "A") {
    return 2;
  }

  return 3;
}

export function FeaturedMatches({ matches, title = "重点赛事" }: FeaturedMatchesProps) {
  const featured = [...matches]
    .sort((left, right) => getPriority(left) - getPriority(right) || left.beginAt.localeCompare(right.beginAt))
    .slice(0, 3);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200/70 bg-white/75 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">优先显示直播、S/A 级赛事</p>
        </div>
      </div>

      <div className="grid gap-2">
        {featured.map((match, index) => {
          const leftTeam = match.teams[0];
          const rightTeam = match.teams[1];
          const leftScore = leftTeam ? getTeamScore(match, leftTeam.id) : null;
          const rightScore = rightTeam ? getTeamScore(match, rightTeam.id) : null;
          const isRunning = match.status === "running";

          return (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.98 }}
              key={match.id}
              transition={{ delay: index * 0.03, duration: 0.18, ease: "easeOut" }}
            >
              <div className={cn(
                "group relative rounded-lg border p-3 transition-colors duration-200",
                isRunning ? "border-red-200 bg-red-50/70" : "border-zinc-200/70 bg-zinc-50/60 hover:bg-zinc-50"
              )}>
                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">{match.tournament}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-zinc-500">
                        <span>{GAME_LABELS[match.game]}</span>
                        <span className="size-1 rounded-full bg-zinc-300" />
                        <span>{match.displayTime}</span>
                      </p>
                    </div>
                    <StatusBadge status={match.status} />
                  </div>
                  
                  <div className="grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamLogo className="size-8" team={leftTeam} />
                      <span className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                        {leftTeam?.acronym || leftTeam?.name || "TBD"}
                      </span>
                    </div>

                    <div className="flex shrink-0 justify-center">
                      <div className="flex items-center gap-1.5 text-xl font-bold tabular-nums text-zinc-900">
                        <span className={leftScore !== null && leftScore > (rightScore ?? 0) ? "text-amber-600" : ""}>{leftScore ?? "-"}</span>
                        <span className="text-zinc-300 font-normal">:</span>
                        <span className={rightScore !== null && rightScore > (leftScore ?? 0) ? "text-amber-600" : ""}>{rightScore ?? "-"}</span>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2">
                      <span className="min-w-0 truncate text-right text-sm font-semibold text-zinc-900">
                        {rightTeam?.acronym || rightTeam?.name || "TBD"}
                      </span>
                      <TeamLogo className="size-8" team={rightTeam} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-black/[0.05] pt-3 text-xs font-medium text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="size-3.5" />
                      {match.bestOf ? `BO${match.bestOf}` : "赛制待定"}
                    </span>
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1.5 text-red-500">
                        <Radio className="size-3.5 animate-pulse" />
                        直播中
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
