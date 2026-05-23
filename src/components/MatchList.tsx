import type { Match } from "../../shared/match";
import { MatchCard } from "./MatchCard";

export function MatchList({ matches }: { matches: Match[] }) {
  return (
    <div className="match-list">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
