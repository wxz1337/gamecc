import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateTeamCachedIcon, type TeamRow } from "../repositories/teamRepository.js";
import { downloadTeamsConcurrently, TEAM_ICONS_DIR } from "./teamIconService.js";

vi.mock("../repositories/teamRepository.js", () => ({
  updateTeamCachedIcon: vi.fn()
}));

const mockedUpdateTeamCachedIcon = vi.mocked(updateTeamCachedIcon);
const mockedFetch = vi.fn();
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function buildTeamRow(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: "team-1",
    name: "Team One",
    acronym: "ONE",
    image_url: "https://cdn.example.com/team-1.png",
    dark_image_url: null,
    cached_image_url: null,
    cached_dark_image_url: null,
    last_seen_at: "2026-06-09T00:00:00.000Z",
    created_at: "2026-06-09T00:00:00.000Z",
    updated_at: "2026-06-09T00:00:00.000Z",
    ...overrides
  };
}

function iconPath(fileName: string): string {
  return resolve(TEAM_ICONS_DIR, fileName);
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockedFetch);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mockedFetch.mockReset();
  mockedUpdateTeamCachedIcon.mockReset();
  mockedUpdateTeamCachedIcon.mockResolvedValue(undefined);
  rmSync(iconPath("team-1.png"), { force: true });
  rmSync(iconPath("team-1_dark.png"), { force: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(iconPath("team-1.png"), { force: true });
  rmSync(iconPath("team-1_dark.png"), { force: true });
});

describe("teamIconService", () => {
  it("downloads an uncached team icon and updates the cached URL", async () => {
    mockedFetch.mockResolvedValue(
      new Response(pngBytes, {
        headers: {
          "content-length": String(pngBytes.length),
          "content-type": "image/png"
        }
      })
    );

    await downloadTeamsConcurrently([buildTeamRow()]);

    expect(mockedFetch).toHaveBeenCalledWith("https://cdn.example.com/team-1.png", {
      signal: expect.any(AbortSignal)
    });
    expect(existsSync(iconPath("team-1.png"))).toBe(true);
    expect(readFileSync(iconPath("team-1.png"))).toEqual(pngBytes);
    expect(mockedUpdateTeamCachedIcon).toHaveBeenCalledWith("team-1", "image", "/api/team-icons/team-1.png");
  });

  it("skips teams whose icons are already cached", async () => {
    await downloadTeamsConcurrently([
      buildTeamRow({
        cached_image_url: "/api/team-icons/team-1.png"
      })
    ]);

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(mockedUpdateTeamCachedIcon).not.toHaveBeenCalled();
  });

  it("rejects non-image responses without writing a cache file", async () => {
    mockedFetch.mockResolvedValue(
      new Response("not an image", {
        headers: {
          "content-type": "text/plain"
        }
      })
    );

    await downloadTeamsConcurrently([buildTeamRow()]);

    expect(existsSync(iconPath("team-1.png"))).toBe(false);
    expect(mockedUpdateTeamCachedIcon).not.toHaveBeenCalled();
  });
});
