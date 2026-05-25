import { describe, expect, it } from "vitest";
import {
  buildCreateSyncRunPayload,
  buildFailureSyncRunPatch,
  buildSuccessSyncRunPatch
} from "./syncRunRepository.js";

describe("syncRunRepository", () => {
  it("builds sync run payloads for create, success and failure updates", () => {
    const startedAt = new Date("2026-05-26T00:00:00.000Z");
    const finishedAt = new Date("2026-05-26T00:05:00.000Z");

    expect(
      buildCreateSyncRunPayload({
        source: "pandascore",
        game: "valorant",
        from_date: "2026-05-24",
        to_date: "2026-05-26",
        status_group: "schedule_running",
        startedAt
      })
    ).toMatchObject({
      source: "pandascore",
      game: "valorant",
      from_date: "2026-05-24",
      to_date: "2026-05-26",
      status_group: "schedule_running",
      started_at: "2026-05-26T00:00:00.000Z",
      finished_at: null,
      success: false,
      fetched_count: 0,
      upserted_count: 0,
      error_code: null,
      error_message: null
    });

    expect(
      buildSuccessSyncRunPatch({
        id: "run-1",
        fetchedCount: 42,
        upsertedCount: 40,
        finishedAt
      })
    ).toMatchObject({
      finished_at: "2026-05-26T00:05:00.000Z",
      success: true,
      fetched_count: 42,
      upserted_count: 40,
      error_code: null,
      error_message: null
    });

    expect(
      buildFailureSyncRunPatch({
        id: "run-1",
        errorCode: "PANDASCORE_TIMEOUT",
        errorMessage: "timeout",
        finishedAt
      })
    ).toMatchObject({
      finished_at: "2026-05-26T00:05:00.000Z",
      success: false,
      error_code: "PANDASCORE_TIMEOUT",
      error_message: "timeout"
    });
  });
});

