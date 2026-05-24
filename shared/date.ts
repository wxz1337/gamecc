import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, differenceInCalendarDays } from "date-fns";

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

export type BeijingDateRange = {
  from: string;
  to: string;
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

export function getBeijingTodayDate(): string {
  return formatInTimeZone(new Date(), BEIJING_TIME_ZONE, "yyyy-MM-dd");
}

export function getBeijingWeekDates(referenceDate: string = getBeijingTodayDate()): string[] {
  if (!isValidDateString(referenceDate)) {
    throw new Error(`Invalid date string: ${referenceDate}`);
  }

  const referenceDay = new Date(`${referenceDate}T00:00:00.000Z`);
  const weekStartOffset = (referenceDay.getUTCDay() + 6) % 7;
  const weekStartDate = addDays(referenceDay, -weekStartOffset);

  return Array.from({ length: 7 }, (_, index) =>
    formatInTimeZone(addDays(weekStartDate, index), BEIJING_TIME_ZONE, "yyyy-MM-dd")
  );
}

export function addBeijingDays(date: string, days: number): string {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid date string: ${date}`);
  }

  const nextDate = addDays(new Date(`${date}T00:00:00.000Z`), days);

  return formatInTimeZone(nextDate, BEIJING_TIME_ZONE, "yyyy-MM-dd");
}

export function getDateSpanDays(from: string, to: string): number {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new Error(`Invalid date string: ${from} - ${to}`);
  }

  const startTime = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const endTime = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));

  return differenceInCalendarDays(new Date(endTime), new Date(startTime)) + 1;
}

export function getBeijingDateRangeUtc(from: string, to: string): BeijingDayRangeUtc {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new Error(`Invalid date range: ${from} - ${to}`);
  }

  const startUtc = fromZonedTime(`${from}T00:00:00.000`, BEIJING_TIME_ZONE);
  const endUtc = fromZonedTime(`${to}T23:59:59.999`, BEIJING_TIME_ZONE);

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