import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Link2, Map, Trophy } from "lucide-react";
import type { Match, Team } from "../../shared/match";
import { GAME_LABELS } from "../constants/matches";
import { formatDateTime, formatDuration, formatTournamentMeta, getTeamScore, getWinnerLabel } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

function TeamLogo({ team }: { team?: Team | null }) {
  const logo = team?.darkModeImageUrl || team?.imageUrl;
  const label = (team?.acronym || team?.name || "TBD").trim();
  const fallback = label.slice(0, 3).toUpperCase() || "TBD";

  if (logo) {
    return (
      <img
        alt=""
        className="size-10 shrink-0 rounded-xl border border-stone-200 bg-white object-contain p-1 sm:size-11"
        src={logo}
        title={label}
      />
    );
  }

  return (
    <span
      className="font-display grid size-10 shrink-0 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wide text-slate-700 sm:size-11"
      title={label}
    >
      {fallback}
    </span>
  );
}

function TeamRow({
  team,
  align = "left",
  winner = false
}: {
  team?: Team | null;
  align?: "left" | "right";
  winner?: boolean;
}) {
  const label = team?.acronym || team?.name || "TBD";
  const isRight = align === "right";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", isRight && "justify-end text-right")}>
      {isRight ? null : <TeamLogo team={team} />}
      <div className={cn("min-w-0", isRight && "order-first")}>
        <span
          className={cn(
            "block truncate text-base font-extrabold leading-tight tracking-tight text-slate-950 sm:text-lg",
            winner && "text-amber-700"
          )}
        >
          {label}
        </span>
      </div>
      {isRight ? <TeamLogo team={team} /> : null}
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gameLabel = GAME_LABELS[match.game];
  const tournamentMeta = formatTournamentMeta(match);
  const leftTeam = match.teams[0];
  const rightTeam = match.teams[1];
  const leftScore = leftTeam ? getTeamScore(match, leftTeam.id) : null;
  const rightScore = rightTeam ? getTeamScore(match, rightTeam.id) : null;
  const visibleGames = match.games?.filter((game) => game.position != null).slice(0, 5) ?? [];
  const scheduleMeta = [
    match.displayEndTime ? `结束 ${match.displayEndTime}` : null,
    match.rescheduled && match.displayOriginalTime ? `原定 ${match.displayOriginalTime}` : null,
    match.forfeit ? "弃权" : null,
    match.detailedStatsAvailable ? "赛后统计" : null
  ].filter((item): item is string => Boolean(item));
  const detailTimestamp = formatDateTime(match.updatedAt);
  const subline = [match.league, match.serie, match.stage].filter(Boolean).join(" · ");
  const scoreText = match.status === "not_started" || leftScore == null || rightScore == null ? "VS" : `${leftScore} : ${rightScore}`;
  const leftWinner = match.status === "finished" && match.winnerTeamId === leftTeam?.id;
  const rightWinner = match.status === "finished" && match.winnerTeamId === rightTeam?.id;
  const winnerText = match.draw ? "平局" : getWinnerLabel(match) ?? "未确定";

  return (
    <Card className="overflow-hidden rounded-2xl border-stone-200 transition-[border-color,box-shadow] duration-200 hover:border-stone-300 hover:shadow-[0_12px_28px_rgba(94,71,38,0.1)]">
      <div className="relative">
        <Button
          aria-expanded={isExpanded}
          aria-label="切换比赛详情"
          className="absolute right-2.5 top-2.5 z-20 size-9 text-slate-500 hover:text-slate-950"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
          variant="ghost"
        >
          <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        <div className="p-3 pr-12 sm:p-4 sm:pr-14">
          <div className="grid gap-3 lg:grid-cols-[112px_minmax(0,1fr)] lg:items-start">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-slate-50 px-3 py-2.5 lg:block">
              <div>
                <p className="font-display text-[22px] font-bold leading-none tabular-nums tracking-tight text-slate-950 sm:text-[23px]">
                  {match.displayTime}
                </p>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">{match.displayDate}</p>
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 pr-8">
                <Badge tone="dark">{gameLabel}</Badge>
                <StatusBadge status={match.status} />
                {match.bestOf ? <Badge tone="neutral">BO{match.bestOf}</Badge> : null}
                <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-800">{match.tournament}</h3>
              </div>

              <div className="grid items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm shadow-stone-900/[0.03] sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:items-center">
                <TeamRow team={leftTeam} winner={leftWinner} />

                <div className="text-center">
                  <div className="font-display rounded-xl border border-stone-200 bg-slate-50 px-3 py-2 text-[22px] font-bold leading-none tabular-nums tracking-tight text-slate-950">
                    {scoreText}
                  </div>
                </div>

                <TeamRow align="right" team={rightTeam} winner={rightWinner} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-slate-500">{subline || " "}</span>
                {match.status === "finished" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-700">
                    <Trophy className="size-3.5" />
                    {match.draw ? "平局" : `胜者 ${winnerText}`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="space-y-4 border-t border-stone-200 bg-stone-50/70 p-4 sm:p-5">
              {match.streamUrl || match.replayUrl ? (
                <div className="flex flex-wrap gap-2">
                  {match.streamUrl ? (
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-[#172033] px-4 text-sm font-bold text-white transition-colors hover:bg-[#273653]"
                      href={match.streamUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Link2 className="size-4" />
                      直播链接
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                  {match.replayUrl ? (
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-50"
                      href={match.replayUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Link2 className="size-4" />
                      回放链接
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {match.status === "finished" ? (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Trophy className="size-4 text-amber-700" />
                  <span className="text-slate-700">赛果：</span>
                  <span className="font-semibold text-slate-900">{winnerText}</span>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["开始时间", formatDateTime(match.beginAt)],
                  ["结束时间", match.endAt ? formatDateTime(match.endAt) : "未结束"],
                  ["数据来源", match.source],
                  ["更新时间", detailTimestamp]
                ].map(([label, value]) => (
                  <div className="rounded-2xl border border-stone-200 bg-white p-3" key={label}>
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                    <strong className="mt-1 block truncate text-sm text-slate-950">{value}</strong>
                  </div>
                ))}
              </div>

              {tournamentMeta.length > 0 || scheduleMeta.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {[...scheduleMeta, ...tournamentMeta].map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {visibleGames.length > 0 ? (
                <div className="grid gap-2">
                  {visibleGames.map((singleGame) => {
                    const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);

                    return (
                      <div
                        className="grid gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-sm text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
                        key={singleGame.id}
                      >
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
                          <Map className="size-4" />
                          地图 / 小局 {singleGame.position}
                        </span>
                        <span>{singleGame.status}</span>
                        <span>{winner ? `胜者 ${winner.acronym || winner.name}` : "胜者未知"}</span>
                        <span>{singleGame.lengthSeconds ? formatDuration(singleGame.lengthSeconds) : "时长未知"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
