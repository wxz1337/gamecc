import { motion } from "framer-motion";
import { Radio, Star, Trophy } from "lucide-react";
import type { Match } from "../../shared/match";
import { GAME_LABELS } from "../constants/matches";
import { getTeamScore } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../lib/utils";

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
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">值得先看的比赛</h2>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 snap-x snap-mandatory scrollbar-none lg:grid lg:grid-cols-3">
        {featured.map((match, index) => {
          const leftTeam = match.teams[0];
          const rightTeam = match.teams[1];
          const leftScore = leftTeam ? getTeamScore(match, leftTeam.id) : null;
          const rightScore = rightTeam ? getTeamScore(match, rightTeam.id) : null;
          const isRunning = match.status === "running";

          return (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.96 }}
              key={match.id}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-[280px] sm:min-w-[320px] w-full shrink-0 snap-start lg:min-w-0"
            >
              <div className={cn(
                "group relative h-full overflow-hidden rounded-2xl border transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]",
                isRunning ? "border-red-100 bg-gradient-to-br from-red-50 to-white" : "border-zinc-200/60 bg-gradient-to-br from-zinc-50 to-white"
              )}>
                {/* Simulated background glow */}
                <div className={cn(
                  "absolute -right-20 -top-20 size-40 rounded-full blur-3xl opacity-20",
                  isRunning ? "bg-red-500" : "bg-zinc-400"
                )} />

                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-zinc-900">{match.tournament}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                        <span>{GAME_LABELS[match.game]}</span>
                        <span className="size-1 rounded-full bg-zinc-300" />
                        <span>{match.displayTime}</span>
                      </p>
                    </div>
                    <StatusBadge status={match.status} />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex w-full min-w-0 flex-col items-center">
                      {leftTeam?.imageUrl ? (
                        <img src={leftTeam.imageUrl} alt="" className="size-12 rounded-full object-contain mb-2 bg-white ring-1 ring-black/5 shadow-sm p-1" />
                      ) : (
                        <div className="size-12 rounded-full mb-2 bg-white ring-1 ring-black/5 shadow-sm flex items-center justify-center text-xs font-bold text-zinc-300">TBD</div>
                      )}
                      <span className="w-full truncate text-center text-sm font-bold text-zinc-900">
                        {leftTeam?.acronym || leftTeam?.name || "TBD"}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-16">
                      <div className="flex items-center gap-1.5 text-2xl font-bold tabular-nums text-zinc-900">
                        <span className={leftScore !== null && leftScore > (rightScore ?? 0) ? "text-amber-600" : ""}>{leftScore ?? "-"}</span>
                        <span className="text-zinc-300 font-normal">:</span>
                        <span className={rightScore !== null && rightScore > (leftScore ?? 0) ? "text-amber-600" : ""}>{rightScore ?? "-"}</span>
                      </div>
                    </div>

                    <div className="flex w-full min-w-0 flex-col items-center">
                      {rightTeam?.imageUrl ? (
                        <img src={rightTeam.imageUrl} alt="" className="size-12 rounded-full object-contain mb-2 bg-white ring-1 ring-black/5 shadow-sm p-1" />
                      ) : (
                        <div className="size-12 rounded-full mb-2 bg-white ring-1 ring-black/5 shadow-sm flex items-center justify-center text-xs font-bold text-zinc-300">TBD</div>
                      )}
                      <span className="w-full truncate text-center text-sm font-bold text-zinc-900">
                        {rightTeam?.acronym || rightTeam?.name || "TBD"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-t border-black/[0.04] pt-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="size-3.5" />
                      {match.bestOf ? `BO${match.bestOf}` : "赛制待定"}
                    </span>
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1.5 text-red-500">
                        <Radio className="size-3.5 animate-pulse" />
                        LIVE
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
