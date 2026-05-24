export type GameType = "cs2" | "valorant" | "lol";
export type GameFilter = "all" | GameType;

export type MatchStatus =
  | "not_started"
  | "running"
  | "finished"
  | "postponed"
  | "cancelled";

export type MatchStatusFilter = "all" | MatchStatus;

export type MatchSort = "beginAt_asc" | "beginAt_desc" | "status" | "updatedAt_desc" | "league";

export type MatchView = "schedule" | "results";
export type MatchTier = "S" | "A" | "B" | "C";
export type MatchTierFilter = "all" | string;

export type MatchFilters = {
  view: MatchView;
  from: string;
  to: string;
  game: GameFilter;
  status: MatchStatusFilter;
  tier: MatchTierFilter;
  query?: string;
  league?: string;
  team?: string;
  region?: string;
  stage?: string;
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type MatchFacets = {
  games: FacetOption[];
  statuses: FacetOption[];
  leagues: FacetOption[];
  teams: FacetOption[];
  regions: FacetOption[];
  stages: FacetOption[];
};

export type MatchQuery = {
  date?: string;
  from: string;
  to: string;
  view: MatchView;
  game: GameFilter;
  status: MatchStatusFilter;
  tier: MatchTierFilter;
  query?: string;
  league?: string;
  team?: string;
  region?: string;
  stage?: string;
  sort: MatchSort;
  refresh?: boolean;
};

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
  replayUrl?: string | null;
  serie?: string | null;
  stage?: string | null;
  source: "pandascore";
  updatedAt: string;
};

export type MatchesResponse = {
  date?: string;
  from: string;
  to: string;
  timezone: "Asia/Shanghai";
  filters: MatchFilters;
  sort: MatchSort;
  stale: boolean;
  updatedAt: string;
  total: number;
  facets: MatchFacets;
  game: GameFilter;
  matches: Match[];
};
