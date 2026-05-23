import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const BEIJING_TIME_ZONE = "Asia/Shanghai" as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type BeijingDayRangeUtc = {
  startUtc: Date;
  endUtc: Date;
  startUtcIso: string;
  endUtcIso: string;
};

export type BeijingDateTimeDisplay = {
  displayDate: string;
  displayTime: string;
};

export function isValidDateString(date: string): boolean {
  if (!DATE_PATTERN.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function getBeijingDayRangeUtc(date: string): BeijingDayRangeUtc {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid date string: ${date}`);
  }

  const startUtc = fromZonedTime(`${date}T00:00:00.000`, BEIJING_TIME_ZONE);
  const endUtc = fromZonedTime(`${date}T23:59:59.999`, BEIJING_TIME_ZONE);

  return {
    startUtc,
    endUtc,
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString()
  };
}

export function formatBeijingDateTime(iso: string): BeijingDateTimeDisplay {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return {
      displayDate: "",
      displayTime: ""
    };
  }

  return {
    displayDate: formatInTimeZone(date, BEIJING_TIME_ZONE, "yyyy-MM-dd"),
    displayTime: formatInTimeZone(date, BEIJING_TIME_ZONE, "HH:mm")
  };
}