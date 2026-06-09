import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../shared/errors.js";
import type { MatchesResponse } from "../shared/match.js";
import { createApp } from "./app.js";
import { getMatches } from "./services/matchService.js";

vi.mock("./services/matchService.js", () => ({
  getMatches: vi.fn()
}));

const mockedGetMatches = vi.mocked(getMatches);
const teamIconsDir = resolve(process.cwd(), "cache", "team-icons");
const testIconFileName = "app-test-team.png";
const testIconPath = resolve(teamIconsDir, testIconFileName);

const sampleResponse: MatchesResponse = {
  date: "2026-05-24",
  from: "2026-05-24",
  to: "2026-05-24",
  timezone: "Asia/Shanghai",
  filters: {
    view: "schedule",
    from: "2026-05-24",
    to: "2026-05-24",
    game: "cs2",
    status: "all",
    tier: "S,A"
  },
  sort: "beginAt_asc",
  stale: false,
  updatedAt: "2026-05-23T18:00:00.000Z",
  total: 1,
  facets: {
    games: [],
    statuses: [],
    leagues: [],
    teams: [],
    regions: [],
    stages: []
  },
  game: "cs2",
  matches: [
    {
      id: "match-1",
      game: "cs2",
      name: "Team A vs Team B",
      league: "ESL Pro League",
      tournament: "ESL Pro League Season 21",
      beginAt: "2026-05-24T10:00:00.000Z",
      displayDate: "2026-05-24",
      displayTime: "18:00",
      status: "not_started",
      teams: [
        { id: "team-a", name: "Team A", acronym: "A" },
        { id: "team-b", name: "Team B", acronym: "B" }
      ],
      streamUrl: null,
      replayUrl: null,
      serie: null,
      stage: null,
      source: "pandascore",
      updatedAt: "2026-05-23T18:00:00.000Z"
    }
  ]
};

describe("API app", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockedGetMatches.mockReset();

    server = await new Promise<Server>((resolve, reject) => {
      const listeningServer = createApp().listen(0, "127.0.0.1", () => {
        resolve(listeningServer);
      });

      listeningServer.once("error", reject);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    rmSync(testIconPath, { force: true });
  });

  it("returns health information", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "esports-schedule-api",
      timezone: "Asia/Shanghai"
    });
  });

  it("returns matches and forwards parsed query parameters", async () => {
    mockedGetMatches.mockResolvedValue(sampleResponse);

    const response = await fetch(`${baseUrl}/api/matches?date=2026-05-24&game=cs2&refresh=1`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(sampleResponse);
    expect(mockedGetMatches).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-05-24",
        from: "2026-05-24",
        to: "2026-05-24",
        game: "cs2",
        refresh: true,
        view: "schedule",
        status: "all",
        tier: "S,A",
        sort: "beginAt_asc"
      })
    );
  });

  it("returns a validation error for invalid dates", async () => {
    const response = await fetch(`${baseUrl}/api/matches?date=2026-13-99`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: ERROR_CODES.INVALID_DATE,
        message: "日期格式不正确"
      }
    });
    expect(mockedGetMatches).not.toHaveBeenCalled();
  });

  it("serves cached team icons with long-lived cache headers", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    mkdirSync(teamIconsDir, { recursive: true });
    writeFileSync(testIconPath, pngBytes);

    const response = await fetch(`${baseUrl}/api/team-icons/${testIconFileName}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400, immutable");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pngBytes);
  });

  it("rejects invalid team icon file names", async () => {
    const response = await fetch(`${baseUrl}/api/team-icons/.env`);

    expect(response.status).toBe(400);
  });

  it("rejects unsupported team icon extensions", async () => {
    const response = await fetch(`${baseUrl}/api/team-icons/team.txt`);

    expect(response.status).toBe(400);
  });
});
