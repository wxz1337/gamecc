import { describe, expect, it } from "vitest";
import {
  BEIJING_TIME_ZONE,
  addBeijingDays,
  formatBeijingDateTime,
  getBeijingDateRangeUtc,
  getBeijingDayRangeUtc,
  getDateSpanDays,
  isValidDateString
} from "./date.js";

describe("date utilities", () => {
  it("validates YYYY-MM-DD strings strictly", () => {
    expect(isValidDateString("2026-05-24")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-5-24")).toBe(false);
    expect(isValidDateString("2026/05/24")).toBe(false);
  });

  it("converts a Beijing day to the expected UTC range", () => {
    const range = getBeijingDayRangeUtc("2026-05-24");

    expect(BEIJING_TIME_ZONE).toBe("Asia/Shanghai");
    expect(range.startUtcIso).toBe("2026-05-23T16:00:00.000Z");
    expect(range.endUtcIso).toBe("2026-05-24T15:59:59.999Z");
  });

  it("formats UTC timestamps as Beijing date and time", () => {
    const display = formatBeijingDateTime("2026-05-23T16:00:00.000Z");

    expect(display).toEqual({
      displayDate: "2026-05-24",
      displayTime: "00:00"
    });
  });

  it("converts a Beijing date range to the expected UTC range", () => {
    const range = getBeijingDateRangeUtc("2026-05-01", "2026-05-24");

    expect(range.startUtcIso).toBe("2026-04-30T16:00:00.000Z");
    expect(range.endUtcIso).toBe("2026-05-24T15:59:59.999Z");
  });

  it("counts inclusive Beijing date spans and adds days correctly", () => {
    expect(getDateSpanDays("2026-05-01", "2026-05-31")).toBe(31);
    expect(addBeijingDays("2026-05-24", 7)).toBe("2026-05-31");
  });
});