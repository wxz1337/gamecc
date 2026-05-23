import { useState } from "react";
import type { Match } from "../../shared/match";
import { GAME_LABELS, STATUS_LABELS } from "../constants/matches";
import { formatDateTime, formatDuration, formatTeams, formatTournamentMeta, getTeamScore, getWinnerLabel } from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <article className="match-card">
      <div className="match-card__time-block">
        <p className="match-card__time">{match.displayTime}</p>
        <p className="match-card__date">{match.displayDate}</p>
      </div>

      <div className="match-card__body">
        <div className="match-card__topline">
          <span className="game-pill">{gameLabel}</span>
          <StatusBadge status={match.status} />
          {match.bestOf ? <span className="bo-pill">BO{match.bestOf}</span> : null}
          <button className="match-card__toggle" onClick={() => setIsExpanded((current) => !current)} type="button">
            {isExpanded ? "收起详情" : "展开详情"}
          </button>
        </div>

        <h3 className="match-card__tournament">{match.tournament}</h3>
        <p className="match-card__league">{match.league}</p>
        {match.serie ? <p className="match-card__round">{match.serie}</p> : null}
        {match.stage ? <p className="match-card__round">{match.stage}</p> : null}
        {match.name ? <p className="match-card__round">{match.name}</p> : null}

        <div className="scoreboard" aria-label={teams}>
          {match.teams.map((team, index) => {
            const score = getTeamScore(match, team.id);
            const isWinner = team.id != null && match.winnerTeamId === team.id;
            const logo = team.darkModeImageUrl || team.imageUrl;

            return (
              <div className={isWinner ? "scoreboard__team is-winner" : "scoreboard__team"} key={`${match.id}-${team.id ?? index}`}>
                {logo ? <img alt="" className="scoreboard__logo" src={logo} /> : <span className="scoreboard__logo scoreboard__logo--empty" />}
                <div className="scoreboard__name-block">
                  <span className="scoreboard__name">{team.acronym || team.name}</span>
                  {team.location ? <span className="scoreboard__location">{team.location}</span> : null}
                </div>
                <strong className="scoreboard__score">{score ?? "-"}</strong>
              </div>
            );
          })}
        </div>

        {winnerLabel ? <p className="match-card__winner">胜者：{winnerLabel}</p> : null}

        {scheduleMeta.length > 0 || tournamentMeta.length > 0 ? (
          <div className="match-card__meta-grid">
            {[...scheduleMeta, ...tournamentMeta].map((item) => (
              <span className="meta-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {visibleGames.length > 0 ? (
          <div className="game-breakdown">
            {visibleGames.map((singleGame) => {
              const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);
              const duration = formatDuration(singleGame.lengthSeconds);

              return (
                <span className="game-chip" key={singleGame.id}>
                  G{singleGame.position}
                  {winner ? ` ${winner.acronym || winner.name}` : ""}
                  {duration ? ` · ${duration}` : ""}
                </span>
              );
            })}
          </div>
        ) : null}

        {isExpanded ? (
          <div className="match-details">
            <div className="match-details__grid">
              <div className="match-details__item">
                <span className="match-details__label">开始时间</span>
                <strong>{formatDateTime(match.beginAt)}</strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">结束时间</span>
                <strong>{match.endAt ? formatDateTime(match.endAt) : "未结束"}</strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">数据来源</span>
                <strong>{match.source}</strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">更新时间</span>
                <strong>{detailTimestamp}</strong>
              </div>
            </div>

            <div className="match-details__grid match-details__grid--compact">
              <div className="match-details__item">
                <span className="match-details__label">BO</span>
                <strong>{match.bestOf ? `BO${match.bestOf}` : "未知"}</strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">胜者</span>
                <strong>{winnerLabel ?? "暂无"}</strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">总比分</span>
                <strong>
                  {match.score?.length
                    ? match.score.map((item) => item.score).join(" : ")
                    : "暂无"}
                </strong>
              </div>
              <div className="match-details__item">
                <span className="match-details__label">状态</span>
                <strong>{statusLabel}</strong>
              </div>
            </div>

            <div className="match-details__links">
              {match.streamUrl ? (
                <a href={match.streamUrl} rel="noreferrer" target="_blank">
                  直播链接
                </a>
              ) : null}
              {match.replayUrl ? (
                <a href={match.replayUrl} rel="noreferrer" target="_blank">
                  回放链接
                </a>
              ) : null}
            </div>

            {visibleGames.length > 0 ? (
              <div className="match-details__games">
                {visibleGames.map((singleGame) => {
                  const winner = match.teams.find((team) => team.id === singleGame.winnerTeamId);

                  return (
                    <div className="match-details__game" key={singleGame.id}>
                      <span>地图 / 小局 {singleGame.position}</span>
                      <strong>{singleGame.status}</strong>
                      <span>{winner ? `胜者 ${winner.acronym || winner.name}` : "胜者未知"}</span>
                      <span>{singleGame.lengthSeconds ? formatDuration(singleGame.lengthSeconds) : "时长未知"}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
