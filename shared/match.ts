export type GameType = "cs2" | "valorant" | "lol";
export type GameFilter = "all" | GameType;

export type MatchStatus =
  | "not_started"
  | "running"
  | "finished"
  | "postponed"
  | "cancelled";

export type Team = {
  id?: string | null;
  name: string;
  acronym?: string | null;
  imageUrl?: string | null;
  darkModeImageUrl?: string | null;
  location?: string | null;
};

export type MatchScore = {
  teamId: string | null;
  score: number;
};

export type MatchGame = {
  id: string;
  position: number | null;
  status: MatchStatus;
  lengthSeconds: number | null;
  winnerTeamId: string | null;
};

export type Match = {
  id: string;
  game: GameType;
  name: string;
  league: string;
  leagueImageUrl?: string | null;
  tournament: string;
  tournamentType?: string | null;
  tournamentCountry?: string | null;
  tournamentRegion?: string | null;
  tournamentTier?: string | null;
  tournamentPrizepool?: string | null;
  hasBracket?: boolean | null;
  beginAt: string;
  endAt?: string | null;
  originalScheduledAt?: string | null;
  displayDate: string;
  displayTime: string;
  displayEndTime?: string | null;
  displayOriginalTime?: string | null;
  status: MatchStatus;
  bestOf?: number | null;
  matchType?: string | null;
  rescheduled?: boolean | null;
  detailedStatsAvailable?: boolean | null;
  draw?: boolean | null;
  forfeit?: boolean | null;
  winnerTeamId?: string | null;
  winnerName?: string | null;
  score?: MatchScore[];
  games?: MatchGame[];
  teams: Team[];
  streamUrl?: string | null;
};

export type MatchesResponse = {
  date: string;
  timezone: "Asia/Shanghai";
  game: GameFilter;
  stale: boolean;
  updatedAt: string;
  matches: Match[];
};
