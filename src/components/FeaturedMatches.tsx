import { motion } from "framer-motion";
import { Radio, Star, Trophy } from "lucide-react";
import type { Match } from "../../shared/match";
import { GAME_LABELS } from "../constants/matches";
import { getTeamScore } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent, CardHeader } from "./ui/card";

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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">值得先看的比赛</h2>
        </div>
        <Star className="size-5 text-amber-500" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {featured.map((match, index) => {
          const leftTeam = match.teams[0];
          const rightTeam = match.teams[1];
          const leftScore = leftTeam ? getTeamScore(match, leftTeam.id) : null;
          const rightScore = rightTeam ? getTeamScore(match, rightTeam.id) : null;

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 8 }}
              key={match.id}
              transition={{ delay: index * 0.04, duration: 0.18 }}
            >
              <Card className="h-full overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">{match.tournament}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {GAME_LABELS[match.game]} · {match.displayTime}
                    </p>
                  </div>
                  <StatusBadge status={match.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-zinc-800">
                      {leftTeam?.acronym || leftTeam?.name || "TBD"}
                    </span>
                    <div className="flex items-center gap-2 text-lg font-bold tabular-nums text-zinc-950">
                      <span>{leftScore ?? "-"}</span>
                      <span className="text-sm text-zinc-300">:</span>
                      <span>{rightScore ?? "-"}</span>
                    </div>
                    <span className="min-w-0 truncate text-right text-sm font-semibold text-zinc-800">
                      {rightTeam?.acronym || rightTeam?.name || "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="size-3.5" />
                      {match.bestOf ? `BO${match.bestOf}` : "赛制待定"}
                    </span>
                    {match.status === "running" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Radio className="size-3.5" />
                        Live
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
