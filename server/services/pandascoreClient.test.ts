import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../../shared/errors.js";
import { fetchPandaScoreMatches } from "./pandascoreClient.js";

type RawMatch = Record<string, unknown>;

function buildPage(size: number): RawMatch[] {
  return Array.from({ length: size }, (_, index) => ({
    id: index + 1
  }));
}

function buildRange() {
  return {
    startUtc: new Date("2026-05-01T00:00:00.000Z"),
    endUtc: new Date("2026-05-07T23:59:59.000Z")
  };
}

describe("pandascoreClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PANDASCORE_API_TOKEN = "test-token";
    process.env.PANDASCORE_REQUEST_TIMEOUT_MS = "1000";
    process.env.PANDASCORE_REQUEST_RETRY_COUNT = "0";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fetches paged matches until the last short page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(buildPage(100)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(buildPage(30)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const matches = await fetchPandaScoreMatches("cs2", buildRange());

    expect(matches).toHaveLength(130);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("adds status filters to PandaScore requests when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(buildPage(1)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPandaScoreMatches("cs2", buildRange(), { statuses: ["not_started", "running"] });

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestUrl.searchParams.get("filter[status]")).toBe("not_started,running");
    expect(requestUrl.searchParams.get("range[begin_at]")).toBe("2026-05-01T00:00:00.000Z,2026-05-07T23:59:59.000Z");
  });

  it("throws timeout error on abort", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPandaScoreMatches("lol", buildRange())).rejects.toMatchObject({
      code: ERROR_CODES.PANDASCORE_TIMEOUT,
      status: 504
    });
  });

  it("retries once for transient network error", async () => {
    process.env.PANDASCORE_REQUEST_RETRY_COUNT = "1";

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify(buildPage(20)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const matches = await fetchPandaScoreMatches("valorant", buildRange());

    expect(matches).toHaveLength(20);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
