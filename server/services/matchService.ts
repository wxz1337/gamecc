import {
  addBeijingDays,
  formatBeijingDateTime,
  getBeijingDateRangeUtc,
  getBeijingTodayDate,
  getDateSpanDays
} from "../../shared/date.js";
import { ERROR_CODES, isAppError } from "../../shared/errors.js";
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
import { buildResponseCacheKey, buildSourceWindowCacheKey, getAny, getFresh, set } from "./cacheService.js";
import { createSyncRun, finishSyncRunFailure, finishSyncRunSuccess } from "../repositories/syncRunRepository.js";
import {
  getFreshWindow,
  getSuccessfulWindowsForCoverage,
  upsertFailedWindow,
  upsertSuccessWindow
} from "../repositories/syncWindowRepository.js";
import { queryMatchesByDateRange, upsertMatches } from "../repositories/matchRepository.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import { runWithInFlightDeduplication } from "./inFlightRequestService.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";

const GAME_LABELS: Record<GameType, string> = {
  cs2: "CS2",
  valorant: "VALORANT",
  lol: "LoL"
};

const VALORANT_STREAM_URL =
  "https://live.bilibili.com/24160384?live_from=81011&spm_id_from=333.1007.top_right_bar_window_history.content.click";
const LOL_STREAM_URL =
  "https://live.bilibili.com/7777?live_from=81011&spm_id_from=333.337.top_right_bar_window_history.content.click";

function getMockStreamUrl(game: GameType): string | null {
  if (game === "valorant") {
    return VALORANT_STREAM_URL;
  }

  if (game === "lol") {
    return LOL_STREAM_URL;
  }

  return null;
}

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

type FetchMatchGroup = {
  game: GameType;
  matches: Match[];
};

type GameWindowResolution = {
  game: GameType;
  matches: Match[];
  stale: boolean;
  warning?: NonNullable<MatchesResponse["warnings"]>[number];
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

function matchesStatus(match: Match, query: MatchQuery): boolean {
  if (query.status === "all") {
    return true;
  }

  if (query.view === "schedule" && query.status === "running") {
    return match.status === "running" || match.status === "not_started";
  }

  return match.status === query.status;
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

  if (!matchesStatus(match, query)) {
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

function getPandaScoreStatuses(query: MatchQuery): MatchStatus[] | undefined {
  if (query.status === "all") {
    return undefined;
  }

  if (query.view === "schedule" && query.status === "running") {
    return ["not_started", "running"];
  }

  return [query.status];
}

function getStatusGroup(query: MatchQuery): string {
  if (query.status === "all") {
    return "all";
  }

  if (query.status === "finished") {
    return "finished";
  }

  return `${query.view}_${query.status}`;
}

type CoverageWindow = {
  from_date: string;
  to_date: string;
};

type DateRange = {
  fromDate: string;
  toDate: string;
};

const FINISHED_COVERAGE_STATUS_GROUPS = ["finished", "schedule_finished", "results_finished"] as const;

export function areWindowsCoveringDateRange(windows: CoverageWindow[], fromDate: string, toDate: string): boolean {
  return getMissingDateRanges(windows, fromDate, toDate).length === 0;
}

export function getMissingDateRanges(windows: CoverageWindow[], fromDate: string, toDate: string): DateRange[] {
  if (fromDate > toDate) {
    return [];
  }

  const missingRanges: DateRange[] = [];
  let nextRequiredDate = fromDate;

  for (const window of [...windows].sort((left, right) => {
    const fromDiff = left.from_date.localeCompare(right.from_date);

    if (fromDiff !== 0) {
      return fromDiff;
    }

    return left.to_date.localeCompare(right.to_date);
  })) {
    if (window.to_date < nextRequiredDate) {
      continue;
    }

    if (window.from_date > toDate) {
      break;
    }

    if (window.from_date > nextRequiredDate) {
      missingRanges.push({
        fromDate: nextRequiredDate,
        toDate: addBeijingDays(window.from_date, -1)
      });
    }

    nextRequiredDate = addBeijingDays(window.to_date, 1);

    if (nextRequiredDate > toDate) {
      return missingRanges;
    }
  }

  if (nextRequiredDate <= toDate) {
    missingRanges.push({
      fromDate: nextRequiredDate,
      toDate
    });
  }

  return missingRanges;
}

function expandDateRangeToDailyRanges(range: DateRange): DateRange[] {
  const ranges: DateRange[] = [];
  let current = range.fromDate;

  while (current <= range.toDate) {
    ranges.push({
      fromDate: current,
      toDate: current
    });
    current = addBeijingDays(current, 1);
  }

  return ranges;
}

function getFinishedCoverageStatusGroups(): readonly string[] {
  return FINISHED_COVERAGE_STATUS_GROUPS;
}

async function fetchAndPersistMissingFinishedRange(
  query: MatchQuery,
  game: GameType,
  range: DateRange
): Promise<void> {
  const sourceWindowKey = buildSourceWindowCacheKey({
    game,
    from: range.fromDate,
    to: range.toDate,
    statusGroup: "finished"
  });

  await runWithInFlightDeduplication(sourceWindowKey, async () => {
    const syncRun = await createSyncRun({
      source: "pandascore",
      game,
      from_date: range.fromDate,
      to_date: range.toDate,
      status_group: "finished"
    });

    try {
      const pandaScoreRange = getBeijingDateRangeUtc(range.fromDate, range.toDate);
      const pandaScoreStatuses = getPandaScoreStatuses(query);
      const rawMatches = await fetchPandaScoreMatches(game, pandaScoreRange, { statuses: pandaScoreStatuses });
      const matches = mapRawMatches(game, rawMatches);
      const dailyRanges = expandDateRangeToDailyRanges(range);

      await upsertMatches(matches);
      await Promise.all(
        dailyRanges.map((dailyRange) =>
          upsertSuccessWindow({
            source: "pandascore",
            game,
            from_date: dailyRange.fromDate,
            to_date: dailyRange.toDate,
            status_group: "finished",
            ttlSeconds: getSourceWindowTtlSeconds(query)
          })
        )
      );
      await finishSyncRunSuccess({
        id: syncRun.id,
        fetchedCount: rawMatches.length,
        upsertedCount: matches.length
      });
    } catch (error) {
      await Promise.allSettled([
        finishSyncRunFailure({
          id: syncRun.id,
          errorCode: isAppError(error) ? error.code : "PANDASCORE_REQUEST_FAILED",
          errorMessage: error instanceof Error ? error.message : "赛程数据暂时获取失败，请稍后重试。"
        }),
        upsertFailedWindow({
          source: "pandascore",
          game,
          from_date: range.fromDate,
          to_date: range.toDate,
          status_group: "finished",
          errorCode: isAppError(error) ? error.code : "PANDASCORE_REQUEST_FAILED",
          errorMessage: error instanceof Error ? error.message : "赛程数据暂时获取失败，请稍后重试。"
        })
      ]);

      throw error;
    }
  });
}

function applyFilters(matches: Match[], query: MatchQuery): Match[] {
  return matches.filter((match) => matchesSearch(match, query));
}

function createResponse(
  query: MatchQuery,
  matches: Match[],
  facets: MatchFacets,
  warnings: NonNullable<MatchesResponse["warnings"]> = [],
  stale = false
): MatchesResponse {
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
    stale,
    updatedAt: new Date().toISOString(),
    total: matches.length,
    facets,
    game: query.game,
    partial: warnings.length > 0,
    warnings: warnings.length > 0 ? warnings : undefined,
    matches
  };
}

function buildGameWarning(game: GameType, error: unknown): NonNullable<MatchesResponse["warnings"]>[number] {
  return {
    code: isAppError(error) ? error.code : "PANDASCORE_REQUEST_FAILED",
    message: `${GAME_LABELS[game]} 赛程数据暂时获取失败。`,
    game
  };
}

function canUseFinalizedDbCache(query: MatchQuery): boolean {
  const today = getBeijingTodayDate();

  return !query.refresh && query.status === "finished" && query.to < today;
}

export function getSourceWindowTtlSeconds(query: MatchQuery): number {
  const today = getBeijingTodayDate();

  if (query.status === "finished") {
    return query.to < today ? 30 * 24 * 60 * 60 : 30 * 60;
  }

  if (query.status === "running") {
    return query.view === "schedule" ? 5 * 60 : 60;
  }

  if (query.status === "not_started") {
    const spanDays = getDateSpanDays(query.from, query.to);

    if (query.from > today) {
      if (spanDays >= 7) {
        return 6 * 60 * 60;
      }

      if (spanDays >= 3) {
        return 2 * 60 * 60;
      }
    }

    return 30 * 60;
  }

  if (query.status === "all") {
    return 10 * 60;
  }

  return 10 * 60;
}

function mapRawMatches(game: GameType, rawMatches: PandaScoreMatch[]): Match[] {
  return rawMatches.map((match) => mapPandaScoreMatch(match, game));
}

async function fetchDirectGameMatches(
  query: MatchQuery,
  game: GameType,
  range: ReturnType<typeof getBeijingDateRangeUtc>
): Promise<GameWindowResolution> {
  const pandaScoreStatuses = getPandaScoreStatuses(query);
  const rawMatches = await fetchPandaScoreMatches(game, range, { statuses: pandaScoreStatuses });

  return {
    game,
    matches: mapRawMatches(game, rawMatches),
    stale: false
  };
}

async function resolveGameWithSupabase(
  query: MatchQuery,
  game: GameType,
  range: ReturnType<typeof getBeijingDateRangeUtc>
): Promise<GameWindowResolution> {
  try {
    const pandaScoreStatuses = getPandaScoreStatuses(query);
    const statusGroup = getStatusGroup(query);
    const fromDate = query.from;
    const toDate = query.to;

    if (canUseFinalizedDbCache(query)) {
      const successfulWindows = await getSuccessfulWindowsForCoverage({
        source: "pandascore",
        game,
        from_date: fromDate,
        to_date: toDate,
        status_groups: [...getFinishedCoverageStatusGroups()]
      });

      const missingRanges = getMissingDateRanges(successfulWindows, fromDate, toDate);

      for (const missingRange of missingRanges) {
        await fetchAndPersistMissingFinishedRange(query, game, missingRange);
      }

      const finalizedMatches = await queryMatchesByDateRange({
        source: "pandascore",
        game,
        fromDate,
        toDate,
        statuses: pandaScoreStatuses
      });

      return {
        game,
        matches: finalizedMatches,
        stale: false
      };
    }

    if (!query.refresh) {
      const freshWindow = await getFreshWindow({
        source: "pandascore",
        game,
        from_date: fromDate,
        to_date: toDate,
        status_group: statusGroup
      });

      if (freshWindow) {
        const matches = await queryMatchesByDateRange({
          source: "pandascore",
          game,
          fromDate,
          toDate,
          statuses: pandaScoreStatuses
        });

        return {
          game,
          matches,
          stale: false
        };
      }
    }

    const sourceWindowKey = buildSourceWindowCacheKey({
      game,
      from: fromDate,
      to: toDate,
      statusGroup
    });

    return await runWithInFlightDeduplication(sourceWindowKey, async () => {
      const syncRun = await createSyncRun({
        source: "pandascore",
        game,
        from_date: fromDate,
        to_date: toDate,
        status_group: statusGroup
      });

      try {
        const rawMatches = await fetchPandaScoreMatches(game, range, { statuses: pandaScoreStatuses });
        const matches = mapRawMatches(game, rawMatches);

        await upsertMatches(matches);
        await upsertSuccessWindow({
          source: "pandascore",
          game,
          from_date: fromDate,
          to_date: toDate,
          status_group: statusGroup,
          ttlSeconds: getSourceWindowTtlSeconds(query)
        });
        await finishSyncRunSuccess({
          id: syncRun.id,
          fetchedCount: rawMatches.length,
          upsertedCount: matches.length
        });

        return {
          game,
          matches,
          stale: false
        };
      } catch (error) {
        await Promise.allSettled([
          finishSyncRunFailure({
            id: syncRun.id,
            errorCode: isAppError(error) ? error.code : "PANDASCORE_REQUEST_FAILED",
            errorMessage: error instanceof Error ? error.message : "赛程数据暂时获取失败，请稍后重试。"
          }),
          upsertFailedWindow({
            source: "pandascore",
            game,
            from_date: fromDate,
            to_date: toDate,
            status_group: statusGroup,
            errorCode: isAppError(error) ? error.code : "PANDASCORE_REQUEST_FAILED",
            errorMessage: error instanceof Error ? error.message : "赛程数据暂时获取失败，请稍后重试。"
          })
        ]);

        try {
          const staleMatches = await queryMatchesByDateRange({
            source: "pandascore",
            game,
            fromDate,
            toDate,
            statuses: pandaScoreStatuses
          });

          if (staleMatches.length > 0) {
            return {
              game,
              matches: staleMatches,
              stale: true,
              warning: buildGameWarning(game, error)
            };
          }
        } catch (staleError) {
          if (!isAppError(staleError) || staleError.code !== ERROR_CODES.SUPABASE_SCHEMA_NOT_READY) {
            throw staleError;
          }
        }

        throw error;
      }
    });
  } catch (error) {
    if (isAppError(error) && error.code === ERROR_CODES.SUPABASE_SCHEMA_NOT_READY) {
      return fetchDirectGameMatches(query, game, range);
    }

    throw error;
  }
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
    streamUrl: getMockStreamUrl(template.game),
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
  const cacheKey = buildResponseCacheKey(query);
  const freshCachedResponse = query.refresh ? null : getFresh<MatchesResponse>(cacheKey);

  if (freshCachedResponse) {
    return freshCachedResponse;
  }

  try {
    const range = getBeijingDateRangeUtc(query.from, query.to);
    const gamesToFetch: GameType[] = query.game === "all" ? ["cs2", "valorant", "lol"] : [query.game];
    const useSupabase = isSupabaseConfigured();
    const settledResults = await Promise.allSettled(
      gamesToFetch.map((game) => (useSupabase ? resolveGameWithSupabase(query, game, range) : fetchDirectGameMatches(query, game, range)))
    );
    const groups: FetchMatchGroup[] = [];
    const warnings: NonNullable<MatchesResponse["warnings"]> = [];
    let firstError: unknown = null;
    let stale = false;

    settledResults.forEach((result, index) => {
      const game = gamesToFetch[index];

      if (result.status === "fulfilled") {
        groups.push({
          game,
          matches: result.value.matches
        });
        stale = stale || result.value.stale;

        if (result.value.warning) {
          warnings.push(result.value.warning);
        }

        return;
      }

      firstError ??= result.reason;
      warnings.push(buildGameWarning(game, result.reason));
    });

    if (groups.length === 0) {
      throw firstError;
    }

    const mappedMatches = sortByBeginAt(groups.flatMap((group) => group.matches));
    const filteredMatches = applyFilters(mappedMatches, query);
    const facets = buildMatchFacets(mappedMatches);
    const response = createResponse(query, sortMatches(filteredMatches, query.sort), facets, warnings, stale);

    if (!response.partial) {
      set(cacheKey, response);
    }

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
