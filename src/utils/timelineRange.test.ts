import { describe, expect, it } from "vitest";
import { buildTimelineStateForDate, getTimelineBounds, normalizeTimelineState, shouldLoadMoreTimeline } from "./timelineRange";

describe("timelineRange", () => {
  it("builds a week-bounded range for the selected date", () => {
    expect(getTimelineBounds("2026-05-24")).toEqual({
      from: "2026-05-24",
      to: "2026-05-24"
    });
    expect(getTimelineBounds("2026-05-18")).toEqual({
      from: "2026-05-18",
      to: "2026-05-24"
    });
  });

  it("normalizes any timeline state to the selected week's end", () => {
    const normalized = normalizeTimelineState(
      {
        view: "schedule",
        from: "2026-05-18",
        to: "2026-05-19",
        game: "all",
        status: "running",
        tier: "S,A",
        query: "",
        league: "",
        team: "",
        region: "",
        stage: "",
        sort: "beginAt_desc"
      },
      "2026-05-18"
    );

    expect(normalized).toMatchObject({
      from: "2026-05-18",
      to: "2026-05-24",
      status: "running",
      sort: "beginAt_asc"
    });
  });

  it("builds a weekly request range for a selected date", () => {
    expect(buildTimelineStateForDate("2026-05-24", "2026-05-24")).toEqual({
      from: "2026-05-24",
      to: "2026-05-24",
      status: "running",
      sort: "beginAt_asc"
    });

    expect(buildTimelineStateForDate("2026-05-23", "2026-05-24")).toEqual({
      from: "2026-05-23",
      to: "2026-05-24",
      status: "finished",
      sort: "beginAt_asc"
    });
  });

  it("prevents append requests once the week end has been loaded", () => {
    expect(
      shouldLoadMoreTimeline({
        loading: false,
        isLoadingMore: false,
        loadedTimelineTo: "2026-05-24",
        timelineEnd: "2026-05-24",
        hasData: true
      })
    ).toBe(false);

    expect(
      shouldLoadMoreTimeline({
        loading: false,
        isLoadingMore: false,
        loadedTimelineTo: "2026-05-23",
        timelineEnd: "2026-05-24",
        hasData: true
      })
    ).toBe(true);
  });
});

