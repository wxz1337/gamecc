import type { Match } from "../../shared/match";
import { GAME_LABELS } from "../constants/matches";
import {
  formatDuration,
  formatTeams,
  formatTournamentMeta,
  getTeamScore,
  getWinnerLabel
} from "../utils/matchFormatters";
import { StatusBadge } from "./StatusBadge";

export function MatchCard({ match }: { match: Match }) {
  const gameLabel = GAME_LABELS[match.game];
  const teams = formatTeams(match);
  const winnerLabel = getWinnerLabel(match);
  const tournamentMeta = formatTournamentMeta(match);
  const visibleGames = match.games?.filter((game) => game.position != null).slice(0, 5) ?? [];
  const scheduleMeta = [
    match.displayEndTime ? `结束 ${match.displayEndTime}` : null,
    match.rescheduled && match.displayOriginalTime ? `原定 ${match.displayOriginalTime}` : null,
    match.forfeit ? "弃权" : null,
    match.detailedStatsAvailable ? "赛后统计" : null
  ].filter((item): item is string => Boolean(item));

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
        </div>

        <h3 className="match-card__tournament">{match.tournament}</h3>
        <p className="match-card__league">{match.league}</p>
        {match.name ? <p className="match-card__round">{match.name}</p> : null}

        <div className="scoreboard" aria-label={teams}>
          {match.teams.map((team) => {
            const score = getTeamScore(match, team.id);
            const isWinner = team.id != null && match.winnerTeamId === team.id;
            const logo = team.darkModeImageUrl || team.imageUrl;

            return (
              <div className={isWinner ? "scoreboard__team is-winner" : "scoreboard__team"} key={`${match.id}-${team.id ?? team.name}`}>
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
              <span className="meta-chip" key={item}>{item}</span>
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
      </div>
    </article>
  );
}
