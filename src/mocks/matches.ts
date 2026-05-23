import { formatBeijingDateTime, getBeijingDayRangeUtc } from "../../shared/date";
import { GameFilter, GameType, Match, MatchesResponse } from "../../shared/match";

type MatchTemplate = {
  game: GameType;
  league: string;
  tournament: string;
  offsetMinutes: number;
  status: Match["status"];
  bestOf: number;
  teams: Match["teams"];
};

const MOCK_MATCH_TEMPLATES: MatchTemplate[] = [
  {
    game: "cs2",
    league: "ESL Pro League",
    tournament: "ESL Pro League Season 21",
    offsetMinutes: 180,
    status: "not_started",
    bestOf: 3,
    teams: [
      { name: "Team Vitality", acronym: "VIT", imageUrl: null },
      { name: "MOUZ", acronym: "MOUZ", imageUrl: null }
    ]
  },
  {
    game: "lol",
    league: "LPL",
    tournament: "LPL Spring Split",
    offsetMinutes: 120,
    status: "running",
    bestOf: 3,
    teams: [
      { name: "Bilibili Gaming", acronym: "BLG", imageUrl: null },
      { name: "Top Esports", acronym: "TES", imageUrl: null }
    ]
  },
  {
    game: "valorant",
    league: "VCT Pacific",
    tournament: "VCT Pacific Stage 1",
    offsetMinutes: 60,
    status: "finished",
    bestOf: 3,
    teams: [
      { name: "Paper Rex", acronym: "PRX", imageUrl: null },
      { name: "DRX", acronym: "DRX", imageUrl: null }
    ]
  }
];

function buildMatch(date: string, template: MatchTemplate): Match {
  const range = getBeijingDayRangeUtc(date);
  const beginAt = new Date(range.startUtc.getTime() + template.offsetMinutes * 60 * 1000).toISOString();
  const display = formatBeijingDateTime(beginAt);

  return {
    id: `${date}-${template.game}-${template.offsetMinutes}`,
    game: template.game,
    name: `${template.teams[0]?.name ?? "TBD"} vs ${template.teams[1]?.name ?? "TBD"}`,
    league: template.league,
    leagueImageUrl: null,
    tournament: template.tournament,
    tournamentType: "online",
    tournamentCountry: null,
    tournamentRegion: null,
    tournamentTier: null,
    tournamentPrizepool: null,
    hasBracket: null,
    beginAt,
    endAt: null,
    originalScheduledAt: null,
    displayDate: display.displayDate,
    displayTime: display.displayTime,
    displayEndTime: null,
    displayOriginalTime: null,
    status: template.status,
    bestOf: template.bestOf,
    matchType: null,
    rescheduled: false,
    detailedStatsAvailable: null,
    draw: false,
    forfeit: false,
    winnerTeamId: null,
    winnerName: null,
    score: [],
    games: [],
    teams: template.teams,
    streamUrl: null
  };
}

function sortByBeginAt(matches: Match[]): Match[] {
  return [...matches].sort((left, right) => new Date(left.beginAt).getTime() - new Date(right.beginAt).getTime());
}

export function createMockMatchesResponse(date: string, game: GameFilter): MatchesResponse {
  const matches = sortByBeginAt(
    MOCK_MATCH_TEMPLATES.map((template) => buildMatch(date, template)).filter((match) => {
      return game === "all" ? true : match.game === game;
    })
  );

  return {
    date,
    timezone: "Asia/Shanghai",
    game,
    stale: false,
    updatedAt: new Date().toISOString(),
    matches
  };
}
