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

type TeamSlotProps = {
  match: Match;
  team?: Team;
  align?: "left" | "right";
  score: number | null;
  isWinner: boolean;
  imgErrors: Record<string, boolean>;
  onImageError: (src: string) => void;
};

function TeamSlot({ match, team, align = "left", score, isWinner, imgErrors, onImageError }: TeamSlotProps) {
  const logo = team?.darkModeImageUrl || team?.imageUrl || "";
  const teamName = team?.acronym || team?.name || "TBD";
  const isPlaceholderTeam = !team || teamName === "TBD";
  const muted = match.status === "finished" && !isWinner;
  const displayScore = match.status === "not_started" ? "-" : score ?? "-";

  return (
    <div
      className={cn(
        "col-span-2 grid min-w-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 md:col-span-1 md:grid-cols-[28px_minmax(0,1fr)]",
        align === "right" && "md:grid-cols-[minmax(0,1fr)_28px] md:text-right"
      )}
    >
      {logo && !imgErrors[logo] ? (
        <img
          alt=""
          className={cn("size-6 rounded-full bg-white/10 object-contain p-1 ring-1 ring-[var(--border-subtle)] md:size-7", align === "right" && "md:order-2")}
          decoding="async"
          loading="lazy"
          onError={() => onImageError(logo)}
          src={logo}
        />
      ) : (
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full bg-[rgba(255,255,255,0.035)] text-[8px] font-bold tracking-wider text-[var(--text-tertiary)] ring-1 ring-[var(--border-subtle)] md:size-7 md:text-[9px]",
            align === "right" && "md:order-2"
          )}
        >
          TBD
        </span>
      )}
      <div className="min-w-0">
        <span className={cn("block truncate text-[13px] font-semibold md:text-[15px]", isPlaceholderTeam ? "text-[var(--text-tertiary)]" : isWinner ? "text-[var(--text-primary)]" : muted ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]")}>
          {teamName}
        </span>
      </div>
      <strong className={cn("text-right text-base font-bold tabular-nums md:hidden", isWinner ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
        {displayScore}
      </strong>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
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

  const handleImageError = (src: string) => {
    setImgErrors((current) => ({ ...current, [src]: true }));
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-colors duration-200 hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)]",
        isRunning && "bg-[rgba(255,77,94,0.035)]",
        isFinished && "opacity-90"
      )}
    >
      {isRunning ? <div className="absolute inset-y-0 left-0 w-px bg-[var(--status-live)]" /> : null}
      <div
        className="grid grid-cols-[minmax(0,1fr)_28px] gap-x-2 gap-y-1 px-2.5 py-1.5 md:min-h-[82px] md:grid-cols-[72px_minmax(86px,1fr)_60px_minmax(86px,1fr)_minmax(120px,190px)_32px] md:items-center md:gap-2 md:px-3 md:py-2 lg:grid-cols-[76px_minmax(100px,1fr)_64px_minmax(100px,1fr)_minmax(140px,210px)_34px] lg:px-4"
        aria-label={teamsLabel}
      >
        <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 md:col-span-1 md:block">
          <div>
            <p
              className={cn(
                "font-mono text-base font-bold tabular-nums tracking-tight md:text-lg",
                isRunning ? "text-[var(--status-live)]" : isUpcoming ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              )}
            >
              {match.displayTime}
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:mt-1 md:flex-col md:items-start md:gap-0.5">
            <Badge className="h-5 px-2 text-[10px]" tone="dark">
              {gameLabel}
            </Badge>
            <StatusBadge status={match.status} />
          </div>
        </div>

        <TeamSlot
          imgErrors={imgErrors}
          isWinner={leftWinner}
          match={match}
          onImageError={handleImageError}
          score={leftScore}
          team={leftTeam}
        />

        <div className="hidden min-w-0 justify-center md:flex">
          {isUpcoming || (!match.score?.length && !isFinished) ? (
            <span className="text-sm font-semibold tracking-wide text-[var(--text-secondary)]">VS</span>
          ) : (
            <div className={cn("flex items-center gap-1.5 text-xl font-bold tabular-nums", isRunning ? "text-[var(--status-live)]" : "text-[var(--text-secondary)]")}>
              <span className={leftWinner ? "text-[var(--text-primary)]" : ""}>{leftScore ?? "-"}</span>
              <span className="text-[var(--text-tertiary)]">-</span>
              <span className={rightWinner ? "text-[var(--text-primary)]" : ""}>{rightScore ?? "-"}</span>
            </div>
          )}
        </div>

        <TeamSlot
          align="right"
          imgErrors={imgErrors}
          isWinner={rightWinner}
          match={match}
          onImageError={handleImageError}
          score={rightScore}
          team={rightTeam}
        />

        <div className="min-w-0 md:border-t-0 md:pl-2 md:pt-0 lg:pl-3">
          <p className="truncate text-[13px] font-medium text-[var(--text-tertiary)] md:text-sm">{match.tournament}</p>
          <p className="mt-0.5 hidden truncate text-xs text-[var(--text-tertiary)] md:block">
            {[match.stage || match.name, match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ") || details || "赛事信息待定"}
          </p>
        </div>

        <Button
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "收起比赛详情" : "展开比赛详情"}
          className="h-7 w-7 justify-self-end px-0 text-[var(--text-tertiary)] hover:bg-[rgba(255,255,255,0.045)] hover:text-[var(--text-primary)] focus-visible:bg-[rgba(255,255,255,0.045)] md:h-8 md:w-8"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
          variant="ghost"
        >
          <Info className="size-4 md:hidden" aria-hidden />
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
