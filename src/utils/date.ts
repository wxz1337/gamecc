import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { BEIJING_TIME_ZONE } from "../../shared/date";

export function getBeijingTodayDateString(now = new Date()): string {
  return formatInTimeZone(now, BEIJING_TIME_ZONE, "yyyy-MM-dd");
}

export function getBeijingTomorrowDateString(now = new Date()): string {
  return formatInTimeZone(addDays(now, 1), BEIJING_TIME_ZONE, "yyyy-MM-dd");
}