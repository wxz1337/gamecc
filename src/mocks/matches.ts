import { addBeijingDays, formatBeijingDateTime, getBeijingDateRangeUtc, getDateSpanDays } from "../../shared/date";
import {
  GameFilter,
  GameType,
  Match,
  MatchFacets,
  MatchSort,
  MatchStatus,
  MatchesResponse
} from "../../shared/match";
import { MatchPageState } from "../utils/matchPageState";

type MatchTemplate = {
  game: GameType;
  league: string;
  tournament: string;
  offsetMinutes: number;
  status: MatchStatus;
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
      { id: null, name: "Team Vitality", acronym: "VIT", imageUrl: null, darkModeImageUrl: null, location: "FR" },
      { id: null, name: "MOUZ", acronym: "MOUZ", imageUrl: null, darkModeImageUrl: null, location: "DE" }
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
      { id: null, name: "Bilibili Gaming", acronym: "BLG", imageUrl: null, darkModeImageUrl: null, location: "CN" },
      { id: null, name: "Top Esports", acronym: "TES", imageUrl: null, darkModeImageUrl: null, location: "CN" }
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
      { id: null, name: "Paper Rex", acronym: "PRX", imageUrl: null, darkModeImageUrl: null, location: "SG" },
      { id: null, name: "DRX", acronym: "DRX", imageUrl: null, darkModeImageUrl: null, location: "KR" }
    ]
  }
];

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}

function buildMatch(date: string, template: MatchTemplate): Match {
  const range = getBeijingDateRangeUtc(date, date);
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
    streamUrl: null,
    replayUrl: null,
    serie: null,
    stage: null,
    source: "pandascore",
    updatedAt: new Date().toISOString()
  };
}

function buildFacetOptions(values: Map<string, number>, labelMapper: (value: string) => string) {
  return [...values.entries()]
    .filter(([value]) => value.trim() !== "")
    .map(([value, count]) => ({ value, label: labelMapper(value), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN", { sensitivity: "base" }));
}

function buildFacets(matches: Match[]): MatchFacets {
  const games = new Map<string, number>();
  const statuses = new Map<string, number>();
  const leagues = new Map<string, number>();
  const teams = new Map<string, number>();
  const regions = new Map<string, number>();
  const stages = new Map<string, number>();

  for (const match of matches) {
    games.set(match.game, (games.get(match.game) ?? 0) + 1);
    statuses.set(match.status, (statuses.get(match.status) ?? 0) + 1);
    leagues.set(match.league, (leagues.get(match.league) ?? 0) + 1);

    for (const team of match.teams) {
      if (team.name) {
        teams.set(team.name, (teams.get(team.name) ?? 0) + 1);
      }
      if (team.location) {
        regions.set(team.location, (regions.get(team.location) ?? 0) + 1);
      }
    }

    if (match.tournamentRegion) {
      regions.set(match.tournamentRegion, (regions.get(match.tournamentRegion) ?? 0) + 1);
    }

    if (match.tournamentCountry) {
      regions.set(match.tournamentCountry, (regions.get(match.tournamentCountry) ?? 0) + 1);
    }

    if (match.stage) {
      stages.set(match.stage, (stages.get(match.stage) ?? 0) + 1);
    }
  }

  return {
    games: buildFacetOptions(games, (value) => value.toUpperCase()),
    statuses: buildFacetOptions(statuses, (value) => value),
    leagues: buildFacetOptions(leagues, (value) => value),
    teams: buildFacetOptions(teams, (value) => value),
    regions: buildFacetOptions(regions, (value) => value),
    stages: buildFacetOptions(stages, (value) => value)
  };
}

function applyFilters(matches: Match[], filters: MatchPageState): Match[] {
  const search = normalizeText(filters.query);
  const league = normalizeText(filters.league);
  const team = normalizeText(filters.team);
  const region = normalizeText(filters.region);
  const stage = normalizeText(filters.stage);

  return matches.filter((match) => {
    if (filters.game !== "all" && match.game !== filters.game) {
      return false;
    }

    if (filters.status !== "all" && match.status !== filters.status) {
      return false;
    }

    if (search) {
      const haystack = [match.game, match.league, match.tournament, match.serie, match.stage, match.name, ...match.teams.flatMap((item) => [item.name, item.acronym ?? ""])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("en-US");

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (league) {
      const haystack = [match.league, match.tournament, match.serie].filter(Boolean).join(" ").toLocaleLowerCase("en-US");
      if (!haystack.includes(league)) {
        return false;
      }
    }

    if (team) {
      const hasTeam = match.teams.some((item) => [item.name, item.acronym ?? "", item.location ?? ""].filter(Boolean).some((part) => part.toLocaleLowerCase("en-US").includes(team)));
      if (!hasTeam) {
        return false;
      }
    }

    if (region) {
      const haystack = [match.tournamentRegion, match.tournamentCountry, ...match.teams.map((item) => item.location ?? "")]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("en-US");
      if (!haystack.includes(region)) {
        return false;
      }
    }

    if (stage) {
      const haystack = [match.stage, match.matchType, match.tournamentType, match.serie].filter(Boolean).join(" ").toLocaleLowerCase("en-US");
      if (!haystack.includes(stage)) {
        return false;
      }
    }

    return true;
  });
}

function sortMatches(matches: Match[], sort: MatchSort): Match[] {
  return [...matches].sort((left, right) => {
    const leftBegin = new Date(left.beginAt).getTime();
    const rightBegin = new Date(right.beginAt).getTime();

    if (sort === "beginAt_desc") {
      return rightBegin - leftBegin;
    }

    if (sort === "league") {
      const leagueDiff = left.league.localeCompare(right.league, "zh-Hans-CN", { sensitivity: "base" });
      return leagueDiff !== 0 ? leagueDiff : leftBegin - rightBegin;
    }

    return leftBegin - rightBegin;
  });
}

function buildMatchesForRange(from: string, to: string): Match[] {
  const days = getDateSpanDays(from, to);
  const matches: Match[] = [];

  for (let index = 0; index < days; index += 1) {
    const currentDate = addBeijingDays(from, index);
    matches.push(...MOCK_MATCH_TEMPLATES.map((template) => buildMatch(currentDate, template)));
  }

  return matches;
}

export function createMockMatchesResponse(filters: MatchPageState): MatchesResponse {
  const matches = sortMatches(applyFilters(buildMatchesForRange(filters.from, filters.to), filters), filters.sort);
  const facets = buildFacets(matches);

  return {
    date: filters.from === filters.to ? filters.from : undefined,
    from: filters.from,
    to: filters.to,
    timezone: "Asia/Shanghai",
    filters,
    sort: filters.sort,
    stale: false,
    updatedAt: new Date().toISOString(),
    total: matches.length,
    facets,
    game: filters.game,
    matches
  };
}
