import { describe, expect, it } from "vitest";
import {
  buildFailureWindowPayload,
  buildSuccessWindowPayload,
  isSyncWindowFresh
} from "./syncWindowRepository.js";

describe("syncWindowRepository", () => {
  it("builds success and failure payloads with stable TTL semantics", () => {
    const now = new Date("2026-05-26T00:00:00.000Z");

    expect(
      buildSuccessWindowPayload({
        source: "pandascore",
        game: "lol",
        from_date: "2026-05-24",
        to_date: "2026-05-26",
        status_group: "results_running",
        ttlSeconds: 900,
        now
      })
    ).toMatchObject({
      source: "pandascore",
      game: "lol",
      from_date: "2026-05-24",
      to_date: "2026-05-26",
      status_group: "results_running",
      last_synced_at: "2026-05-26T00:00:00.000Z",
      expires_at: "2026-05-26T00:15:00.000Z",
      last_error_code: null,
      last_error_message: null
    });

    expect(
      buildFailureWindowPayload({
        source: "pandascore",
        game: "lol",
        from_date: "2026-05-24",
        to_date: "2026-05-26",
        status_group: "results_running",
        errorCode: "PANDASCORE_TIMEOUT",
        errorMessage: "timeout",
        retryAfterSeconds: 60,
        now
      })
    ).toMatchObject({
      source: "pandascore",
      game: "lol",
      from_date: "2026-05-24",
      to_date: "2026-05-26",
      status_group: "results_running",
      expires_at: "2026-05-26T00:01:00.000Z",
      last_error_code: "PANDASCORE_TIMEOUT",
      last_error_message: "timeout"
    });
  });

  it("identifies freshness by expires_at", () => {
    expect(
      isSyncWindowFresh(
        {
          id: "1",
          source: "pandascore",
          game: "cs2",
          from_date: "2026-05-24",
          to_date: "2026-05-26",
          status_group: "all",
          last_synced_at: "2026-05-26T00:00:00.000Z",
          expires_at: "2026-05-26T00:15:00.000Z",
          last_error_code: null,
          last_error_message: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z"
        },
        new Date("2026-05-26T00:10:00.000Z")
      )
    ).toBe(true);

    expect(
      isSyncWindowFresh(
        {
          id: "1",
          source: "pandascore",
          game: "cs2",
          from_date: "2026-05-24",
          to_date: "2026-05-26",
          status_group: "all",
          last_synced_at: "2026-05-26T00:00:00.000Z",
          expires_at: "2026-05-26T00:15:00.000Z",
          last_error_code: null,
          last_error_message: null,
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z"
        },
        new Date("2026-05-26T00:20:00.000Z")
      )
    ).toBe(false);
  });
});

