import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Info, Link2, Map, Trophy } from "lucide-react";
import type { Match } from "../../shared/match";
import { GAME_LABELS, STATUS_LABELS } from "../constants/matches";
import { formatDateTime, formatDuration, formatTeams, formatTournamentMeta, getTeamScore, getWinnerLabel } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const gameLabel = GAME_LABELS[match.game];
  const teams = formatTeams(match);
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

  const isRunning = match.status === "running";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-[1px] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)]",
        isRunning && "border-[rgba(255,77,94,0.18)]"
      )}
    >
      {isRunning ? <div className="absolute inset-x-0 top-0 h-px bg-[var(--status-live)] opacity-60" /> : null}
      <div className="grid gap-4 p-4 sm:grid-cols-[76px_minmax(0,1fr)] sm:p-5">
        <div className="relative flex items-baseline justify-between gap-3 sm:block">
          <p className={cn("font-mono text-2xl font-bold tabular-nums tracking-tight", isRunning ? "text-[var(--status-live)]" : "text-[var(--text-primary)]")}>
            {isRunning ? <span className="absolute -left-3.5 top-2.5 size-1.5 rounded-full bg-[var(--status-live)] animate-pulse sm:hidden" /> : null}
            {match.displayTime}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{match.displayDate}</p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">{gameLabel}</Badge>
            <StatusBadge status={match.status} />
            {match.bestOf ? <Badge tone="neutral">BO{match.bestOf}</Badge> : null}
            {match.tournamentTier ? <Badge tone="neutral">{match.tournamentTier}级</Badge> : null}
            <Button className="ml-auto h-8 px-2.5" onClick={() => setIsExpanded((current) => !current)} type="button" variant="ghost">
              <Info className="size-4" />
              详情
              <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)]">{match.tournament}</h3>
            <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{[match.league, match.serie, match.stage, match.name].filter(Boolean).join(" · ")}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2" aria-label={teams}>
            {match.teams.map((team, index) => {
              const score = getTeamScore(match, team.id);
              const isWinner = team.id != null && match.winnerTeamId === team.id;
              const logo = team.darkModeImageUrl || team.imageUrl;

              return (
                <div
                  className={cn(
                    "grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors duration-200",
                    isWinner
                      ? "border-transparent bg-[rgba(217,173,106,0.055)]"
                      : "border-transparent bg-[rgba(255,255,255,0.018)] group-hover:bg-[rgba(255,255,255,0.028)]"
                  )}
                  key={`${match.id}-${team.id ?? index}`}
                >
                  {logo && !imgErrors[logo] ? (
                    <img
                      alt=""
                      className="size-10 rounded-full bg-white/10 object-contain p-1 ring-1 ring-[var(--border-default)]"
                      src={logo}
                      onError={() => setImgErrors((prev) => ({ ...prev, [logo!]: true }))}
                    />
                  ) : (
                    <span className="grid size-10 place-items-center rounded-full bg-[var(--bg-surface-hover)] text-[10px] font-bold tracking-wider text-[var(--text-tertiary)] ring-1 ring-[var(--border-default)]">
                      TBD
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className={cn("block truncate text-sm font-bold", isWinner ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                      {team.acronym || team.name}
                    </span>
                    {team.location ? <span className="mt-0.5 block truncate text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{team.location}</span> : null}
                  </div>
                  <strong className={cn("min-w-8 text-right text-2xl font-bold tabular-nums", isWinner ? "text-[var(--status-warning)]" : "text-[var(--text-secondary)]")}>
                    {score ?? "-"}
                  </strong>
                </div>
              );
            })}
          </div>

          {winnerLabel || scheduleMeta.length > 0 || tournamentMeta.length > 0 || visibleGames.length > 0 ? (
            <div className="space-y-3">
              {winnerLabel ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                  <Trophy className="size-4" />
                  胜者：{winnerLabel}
                </p>
              ) : null}

              {scheduleMeta.length > 0 || tournamentMeta.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {[...scheduleMeta, ...tournamentMeta].map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {visibleGames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visibleGames.map((singleGame) => {
                    const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);
                    const duration = formatDuration(singleGame.lengthSeconds);

                    return (
                      <Badge key={singleGame.id} tone="green">
                        G{singleGame.position}
                        {winner ? ` ${winner.acronym || winner.name}` : ""}
                        {duration ? ` · ${duration}` : ""}
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
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
        </div>
      </div>
    </Card>
  );
}
