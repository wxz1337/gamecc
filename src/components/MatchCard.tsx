import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Info, Link2, Map, Trophy } from "lucide-react";
import type { Match, Team } from "../../shared/match";
import { GAME_LABELS, STATUS_LABELS } from "../constants/matches";
import { formatDateTime, formatDuration, formatTeams, formatTournamentMeta, getTeamScore, getWinnerLabel } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { GameIcon } from "./GameIcon";
import { TeamLogo } from "./TeamLogo";

type TeamSlotProps = {
  match: Match;
  team?: Team;
  align?: "left" | "right";
  isWinner: boolean;
};

function TeamSlot({ match, team, align = "left", isWinner }: TeamSlotProps) {
  const teamName = team?.acronym || team?.name || "TBD";
  const isPlaceholderTeam = !team || teamName === "TBD";
  const muted = match.status === "finished" && !isWinner;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "left" ? "flex-row-reverse justify-end text-right" : "justify-start text-left"
      )}
    >
      <TeamLogo className="md:size-8" team={team} />
      <div className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-semibold leading-5 md:text-[15px]", isPlaceholderTeam ? "text-[var(--text-tertiary)]" : isWinner ? "text-[var(--text-primary)]" : muted ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]")}>
          {teamName}
        </span>
      </div>
    </div>
  );
}

type MatchScoreProps = {
  compact?: boolean;
  isFinished: boolean;
  isRunning: boolean;
  isUpcoming: boolean;
  hasScore: boolean;
  leftScore: number | null;
  rightScore: number | null;
  leftWinner: boolean;
  rightWinner: boolean;
};

function MatchScore({ compact = false, isFinished, isRunning, isUpcoming, hasScore, leftScore, rightScore, leftWinner, rightWinner }: MatchScoreProps) {
  if (isUpcoming || (!hasScore && !isFinished)) {
    return <span className="text-xs font-semibold tracking-wide text-[var(--text-tertiary)] md:text-sm">VS</span>;
  }

  return (
    <div className={cn("flex items-center justify-center gap-1.5 font-bold tabular-nums", compact ? "text-base" : "text-[22px] leading-none", isRunning ? "text-[var(--status-live)]" : "text-[var(--text-secondary)]")}>
      <span className={leftWinner ? "text-[var(--text-primary)]" : ""}>{leftScore ?? "-"}</span>
      <span className="text-[var(--text-tertiary)]">-</span>
      <span className={rightWinner ? "text-[var(--text-primary)]" : ""}>{rightScore ?? "-"}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gameLabel = GAME_LABELS[match.game];
  const teamsLabel = formatTeams(match);
  const winnerLabel = getWinnerLabel(match);
  const tournamentMeta = formatTournamentMeta(match);
  const statusLabel = STATUS_LABELS[match.status];
  const visibleGames = match.games?.filter((game) => game.position != null).slice(0, 5) ?? [];
  const scheduleMeta = [
    match.displayEndTime ? `结束 ${match.displayEndTime}` : null,
    match.rescheduled && match.displayOriginalTime ? `原定 ${match.displayOriginalTime}` : null,
    match.forfeit ? "弃权" : null,
    match.detailedStatsAvailable ? "赛后统计" : null
  ].filter((item): item is string => Boolean(item));
  const detailTimestamp = formatDateTime(match.updatedAt);
  const [leftTeam, rightTeam] = match.teams;
  const leftScore = getTeamScore(match, leftTeam?.id);
  const rightScore = getTeamScore(match, rightTeam?.id);
  const leftWinner = leftTeam?.id != null && match.winnerTeamId === leftTeam.id;
  const rightWinner = rightTeam?.id != null && match.winnerTeamId === rightTeam.id;
  const isRunning = match.status === "running";
  const isFinished = match.status === "finished";
  const isUpcoming = match.status === "not_started";
  const details = [match.league, match.serie, match.stage, match.name].filter(Boolean).join(" · ");

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-colors duration-200 hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)]",
        isRunning && "bg-[rgba(255,77,94,0.035)]",
        isFinished && "opacity-90"
      )}
    >
      {isRunning ? <div className="absolute inset-y-0 left-0 w-px bg-[var(--status-live)]" /> : null}
      <div className="px-3 py-3 md:hidden" aria-label={teamsLabel}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p
            className={cn(
              "font-mono text-lg font-bold leading-6 tabular-nums tracking-tight",
              isRunning ? "text-[var(--status-live)]" : isUpcoming ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}
          >
            {match.displayTime}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <GameIcon className="size-3.5 shrink-0" game={match.game} />
              <span className="truncate">{gameLabel}</span>
            </span>
            <StatusBadge status={match.status} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center gap-2">
          <TeamSlot isWinner={leftWinner} match={match} team={leftTeam} />
          <div className="flex justify-center">
            <MatchScore
              compact
              hasScore={Boolean(match.score?.length)}
              isFinished={isFinished}
              isRunning={isRunning}
              isUpcoming={isUpcoming}
              leftScore={leftScore}
              leftWinner={leftWinner}
              rightScore={rightScore}
              rightWinner={rightWinner}
            />
          </div>
          <TeamSlot align="right" isWinner={rightWinner} match={match} team={rightTeam} />
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
          <p className="min-w-0 truncate text-[13px] font-medium leading-5 text-[var(--text-tertiary)]">{match.tournament}</p>
          <Button
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "收起比赛详情" : "展开比赛详情"}
            className="h-7 w-7 shrink-0 px-0 text-[var(--text-tertiary)] hover:bg-[rgba(255,255,255,0.045)] hover:text-[var(--text-primary)]"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            <Info className="size-3.5" aria-hidden />
            <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      <div
        className="hidden min-h-[88px] grid-cols-[112px_minmax(0,1fr)_minmax(150px,180px)_44px] items-center gap-3 px-4 py-3 md:grid 2xl:grid-cols-[112px_minmax(0,1fr)_220px_44px] 2xl:gap-4 2xl:px-5"
        aria-label={teamsLabel}
      >
        <div className="min-w-0">
          <p className={cn("font-mono text-lg font-bold leading-6 tabular-nums tracking-tight", isRunning ? "text-[var(--status-live)]" : isUpcoming ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{match.displayTime}</p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-5 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <GameIcon className="size-3.5 shrink-0" game={match.game} />
              {gameLabel}
            </span>
            <span className="h-3 w-px shrink-0 bg-[var(--border-strong)]" aria-hidden />
            <StatusBadge status={match.status} />
          </div>
        </div>

        <div className="grid w-full max-w-[680px] grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-3 justify-self-center 2xl:gap-4">
          <TeamSlot isWinner={leftWinner} match={match} team={leftTeam} />

          <div className="flex min-w-0 justify-center">
            <MatchScore
              hasScore={Boolean(match.score?.length)}
              isFinished={isFinished}
              isRunning={isRunning}
              isUpcoming={isUpcoming}
              leftScore={leftScore}
              leftWinner={leftWinner}
              rightScore={rightScore}
              rightWinner={rightWinner}
            />
          </div>

          <TeamSlot align="right" isWinner={rightWinner} match={match} team={rightTeam} />
        </div>

        <div className="min-w-0 border-l border-[var(--border-subtle)] pl-3 2xl:pl-4">
          <p className="truncate text-sm font-semibold leading-5 text-[var(--text-secondary)]">{match.tournament}</p>
          <p className="mt-0.5 truncate text-xs leading-5 text-[var(--text-tertiary)]">
            {[match.stage || match.name, match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ") || details || "赛事信息待定"}
          </p>
        </div>

        <Button
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "收起比赛详情" : "展开比赛详情"}
          className="h-11 w-11 justify-self-end px-0 text-[var(--text-tertiary)] hover:bg-[rgba(255,255,255,0.045)] hover:text-[var(--text-primary)] focus-visible:bg-[rgba(255,255,255,0.045)]"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
          variant="ghost"
        >
          <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            data-expanded-details
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="space-y-4 border-t border-[var(--border-subtle)] px-3 py-3 md:px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{details || match.name}</p>
                {winnerLabel ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <Trophy className="size-4" />
                    胜者：{winnerLabel}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["开始时间", formatDateTime(match.beginAt)],
                  ["结束时间", match.endAt ? formatDateTime(match.endAt) : "未结束"],
                  ["数据来源", match.source],
                  ["更新时间", detailTimestamp],
                  ["赛制", match.bestOf ? `BO${match.bestOf}` : "未知"],
                  ["胜者", winnerLabel ?? "暂无"],
                  ["总比分", match.score?.length ? match.score.map((item) => item.score).join(" : ") : "暂无"],
                  ["状态", statusLabel]
                ].map(([label, value]) => (
                  <div className="rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.018)] p-3" key={label}>
                    <span className="text-xs font-medium text-[var(--text-tertiary)]">{label}</span>
                    <strong className="mt-1 block truncate text-sm text-[var(--text-primary)]">{value}</strong>
                  </div>
                ))}
              </div>

              {scheduleMeta.length > 0 || tournamentMeta.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {[...scheduleMeta, ...tournamentMeta].map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {match.streamUrl || match.replayUrl ? (
                <div className="flex flex-wrap gap-2">
                  {match.streamUrl ? (
                    <a
                      className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--brand-primary-hover)]"
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
                      className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
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

              {visibleGames.length > 0 ? (
                <div className="grid gap-2">
                  {visibleGames.map((singleGame) => {
                    const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);

                    return (
                      <div
                        className="grid gap-2 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.018)] p-3 text-sm text-[var(--text-secondary)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
                        key={singleGame.id}
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-[var(--text-primary)]">
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
