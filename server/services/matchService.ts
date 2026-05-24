import { addBeijingDays, formatBeijingDateTime, getBeijingDateRangeUtc } from "../../shared/date.js";
import {
  GameFilter,
  GameType,
  Match,
  MatchFacets,
  MatchFilters,
  MatchQuery,
  MatchSort,
  MatchStatus,
  MatchStatusFilter,
  MatchesResponse
} from "../../shared/match.js";
import { mapPandaScoreMatch } from "../mappers/pandascoreMapper.js";
import { PandaScoreMatch } from "../types/pandascore.js";
import { buildCacheKey, getAny, getFresh, set } from "./cacheService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";

const GAME_LABELS: Record<GameType, string> = {
  cs2: "CS2",
  valorant: "VALORANT",
  lol: "LoL"
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  not_started: "未开始",
  running: "进行中",
  finished: "已结束",
  postponed: "延期",
  cancelled: "取消"
};

const STATUS_PRIORITY: Record<MatchStatus, number> = {
  running: 0,
  not_started: 1,
  finished: 2,
  postponed: 3,
  cancelled: 4
};

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

function buildMatchSearchText(match: Match): string {
  return [
    GAME_LABELS[match.game],
    match.league,
    match.tournament,
    match.serie,
    match.stage,
    match.name,
    ...match.teams.flatMap((team) => [team.name, team.acronym ?? "", team.location ?? ""])
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase("en-US"))
    .join(" ");
}

function getMatchRegionText(match: Match): string {
  return [match.league, match.tournament, match.serie, match.tournamentRegion, match.tournamentCountry, ...match.teams.map((team) => team.location ?? "")]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase("en-US"))
    .join(" ");
}

function getMatchStageText(match: Match): string {
  return [match.stage, match.matchType, match.tournamentType, match.serie]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase("en-US"))
    .join(" ");
}

function matchesText(value: string | undefined, expected: string): boolean {
  if (!value) {
    return true;
  }

  return expected.includes(value);
}

function matchesTier(match: Match, tier: MatchQuery["tier"]): boolean {
  if (tier === "all") {
    return true;
  }

  const matchTier = match.tournamentTier?.trim().toUpperCase();

  return matchTier != null && matchTier !== "" && tier.split(",").includes(matchTier);
}

function matchesSearch(match: Match, query: MatchQuery): boolean {
  if (query.query) {
    const needle = normalizeText(query.query);
    if (!buildMatchSearchText(match).includes(needle)) {
      return false;
    }
  }

  if (query.league) {
    const needle = normalizeText(query.league);
    const text = [match.league, match.tournament, match.serie].filter(Boolean).join(" ").toLocaleLowerCase("en-US");
    if (!text.includes(needle)) {
      return false;
    }
  }

  if (query.team) {
    const needle = normalizeText(query.team);
    const teamMatches = match.teams.some((team) => {
      return [team.name, team.acronym ?? "", team.location ?? ""]
        .filter(Boolean)
        .some((part) => part.toLocaleLowerCase("en-US").includes(needle));
    });

    if (!teamMatches) {
      return false;
    }
  }

  if (query.region) {
    const needle = normalizeText(query.region);
    if (!getMatchRegionText(match).includes(needle)) {
      return false;
    }
  }

  if (query.stage) {
    const needle = normalizeText(query.stage);
    if (!getMatchStageText(match).includes(needle)) {
      return false;
    }
  }

  if (query.status !== "all" && match.status !== query.status) {
    return false;
  }

  if (!matchesTier(match, query.tier)) {
    return false;
  }

  return true;
}

function sortMatches(matches: Match[], sort: MatchSort): Match[] {
  return [...matches].sort((left, right) => {
    const leftBegin = new Date(left.beginAt).getTime();
    const rightBegin = new Date(right.beginAt).getTime();
    const leftUpdated = new Date(left.updatedAt).getTime();
    const rightUpdated = new Date(right.updatedAt).getTime();

    if (sort === "beginAt_desc") {
      return rightBegin - leftBegin;
    }

    if (sort === "status") {
      const statusDiff = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
      return statusDiff !== 0 ? statusDiff : leftBegin - rightBegin;
    }

    if (sort === "updatedAt_desc") {
      const updatedDiff = rightUpdated - leftUpdated;
      return updatedDiff !== 0 ? updatedDiff : rightBegin - leftBegin;
    }

    if (sort === "league") {
      const leagueDiff = left.league.localeCompare(right.league, "zh-Hans-CN", { sensitivity: "base" });
      if (leagueDiff !== 0) {
        return leagueDiff;
      }

      return leftBegin - rightBegin;
    }

    return leftBegin - rightBegin;
  });
}

function buildFacetOptions(values: Map<string, number>, labelMapper: (value: string) => string) {
  return [...values.entries()]
    .filter(([value]) => value.trim() !== "")
    .map(([value, count]) => ({
      value,
      label: labelMapper(value),
      count
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN", { sensitivity: "base" }));
}

function buildMatchFacets(matches: Match[]): MatchFacets {
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

    if (match.tournamentRegion) {
      regions.set(match.tournamentRegion, (regions.get(match.tournamentRegion) ?? 0) + 1);
    }

    if (match.tournamentCountry) {
      regions.set(match.tournamentCountry, (regions.get(match.tournamentCountry) ?? 0) + 1);
    }

    if (match.stage) {
      stages.set(match.stage, (stages.get(match.stage) ?? 0) + 1);
    }

    for (const team of match.teams) {
      if (team.name) {
        teams.set(team.name, (teams.get(team.name) ?? 0) + 1);
      }
    }
  }

  return {
    games: buildFacetOptions(games, (value) => GAME_LABELS[value as GameType] ?? value),
    statuses: buildFacetOptions(statuses, (value) => STATUS_LABELS[value as MatchStatus] ?? value),
    leagues: buildFacetOptions(leagues, (value) => value),
    teams: buildFacetOptions(teams, (value) => value),
    regions: buildFacetOptions(regions, (value) => value),
    stages: buildFacetOptions(stages, (value) => value)
  };
}

function applyFilters(matches: Match[], query: MatchQuery): Match[] {
  return matches.filter((match) => matchesSearch(match, query));
}

function createResponse(query: MatchQuery, matches: Match[], facets: MatchFacets): MatchesResponse {
  return {
    date: query.date,
    from: query.from,
    to: query.to,
    timezone: "Asia/Shanghai",
    filters: {
      view: query.view,
      from: query.from,
      to: query.to,
      game: query.game,
      status: query.status,
      tier: query.tier,
      query: query.query,
      league: query.league,
      team: query.team,
      region: query.region,
      stage: query.stage
    },
    sort: query.sort,
    stale: false,
    updatedAt: new Date().toISOString(),
    total: matches.length,
    facets,
    game: query.game,
    matches
  };
}

function buildMockMatch(date: string, template: MatchTemplate): Match {
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
    tournamentTier: "S",
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

function sortByBeginAt(matches: Match[]): Match[] {
  return [...matches].sort((left, right) => new Date(left.beginAt).getTime() - new Date(right.beginAt).getTime());
}

export function createMockMatchesResponse(date: string, game: GameFilter): MatchesResponse {
  const matches = sortByBeginAt(
    MOCK_MATCH_TEMPLATES.map((template) => buildMockMatch(date, template)).filter((match) => {
      return game === "all" ? true : match.game === game;
    })
  );

  const facets = buildMatchFacets(matches);

  return {
    date,
    from: date,
    to: date,
    timezone: "Asia/Shanghai",
    filters: {
      view: "schedule",
      from: date,
      to: date,
      game,
      status: "all",
      tier: "S,A"
    },
    sort: "beginAt_asc",
    stale: false,
    updatedAt: new Date().toISOString(),
    total: matches.length,
    facets,
    game,
    matches
  };
}

export async function getMatches(query: MatchQuery): Promise<MatchesResponse> {
  const cacheKey = buildCacheKey(query);
  const freshCachedResponse = query.refresh ? null : getFresh<MatchesResponse>(cacheKey);

  if (freshCachedResponse) {
    return freshCachedResponse;
  }

  try {
    const range = getBeijingDateRangeUtc(query.from, query.to);
    const gamesToFetch: GameType[] = query.game === "all" ? ["cs2", "valorant", "lol"] : [query.game];
    const matchGroups = await Promise.all(gamesToFetch.map((game) => fetchPandaScoreMatches(game, range)));
    const mappedMatches = sortByBeginAt(matchGroups.flatMap((group, index) => {
      const game = gamesToFetch[index];

      return group.map((match) => mapPandaScoreMatch(match, game));
    }));
    const filteredMatches = applyFilters(mappedMatches, query);
    const facets = buildMatchFacets(mappedMatches);
    const response = createResponse(query, sortMatches(filteredMatches, query.sort), facets);

    set(cacheKey, response);

    return response;
  } catch (error) {
    const staleCachedResponse = getAny<MatchesResponse>(cacheKey);

    if (staleCachedResponse) {
      return {
        ...staleCachedResponse,
        stale: true
      };
    }

    throw error;
  }
}
