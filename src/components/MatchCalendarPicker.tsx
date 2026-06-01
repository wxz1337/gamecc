import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getBeijingWeekDates } from "../../shared/date";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

type MatchCalendarPickerProps = {
  selectedDate: string;
  today: string;
  matchCounts?: Record<string, number>;
  onSelectDate: (date: string) => void;
  onClose: () => void;
};

type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function toDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateString(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function getMonthCalendarDays(year: number, monthIndex: number): CalendarDay[] {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekdayOffset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - firstWeekdayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);

    return {
      date: toDateString(date),
      dayNumber: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === monthIndex
    };
  });
}

function getMonthTitle(year: number, monthIndex: number): string {
  return `${year}年 ${monthIndex + 1}月`;
}

export function MatchCalendarPicker({
  selectedDate,
  today,
  matchCounts = {},
  onSelectDate,
  onClose
}: MatchCalendarPickerProps) {
  const initialDate = parseDateString(selectedDate);
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(initialDate.getUTCFullYear(), initialDate.getUTCMonth(), 1)));
  const [pendingDate, setPendingDate] = useState(selectedDate);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const year = cursor.getUTCFullYear();
  const monthIndex = cursor.getUTCMonth();
  const calendarDays = useMemo(() => getMonthCalendarDays(year, monthIndex), [year, monthIndex]);
  const selectedWeekDates = useMemo(() => new Set(getBeijingWeekDates(pendingDate)), [pendingDate]);
  const pendingCount = matchCounts[pendingDate] ?? 0;

  const moveMonth = (months: number) => {
    setCursor((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + months, 1)));
  };

  const confirmDate = () => {
    onSelectDate(pendingDate);
  };

  return (
    <section
      aria-label="选择赛事日期"
      className="match-calendar-panel"
      role="dialog"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="match-calendar-panel__header">
        <button className="match-calendar-panel__nav" onClick={() => moveMonth(-12)} type="button" aria-label="上一年">
          <ChevronsLeft className="size-4" />
        </button>
        <button className="match-calendar-panel__nav" onClick={() => moveMonth(-1)} type="button" aria-label="上一月">
          <ChevronLeft className="size-4" />
        </button>
        <strong className="match-calendar-panel__title">{getMonthTitle(year, monthIndex)}</strong>
        <button className="match-calendar-panel__nav" onClick={() => moveMonth(1)} type="button" aria-label="下一月">
          <ChevronRight className="size-4" />
        </button>
        <button className="match-calendar-panel__nav" onClick={() => moveMonth(12)} type="button" aria-label="下一年">
          <ChevronsRight className="size-4" />
        </button>
      </header>

      <div className="match-calendar-grid match-calendar-grid--weekdays">
        {WEEKDAY_LABELS.map((weekday) => (
          <span className="match-calendar-grid__weekday" key={weekday}>
            {weekday}
          </span>
        ))}
      </div>

      <div className="match-calendar-grid">
        {calendarDays.map((day) => {
          const count = matchCounts[day.date] ?? 0;
          const className = [
            "match-calendar-day",
            day.isCurrentMonth ? "" : "is-muted",
            day.date === today ? "is-today" : "",
            day.date === pendingDate ? "is-selected" : "",
            selectedWeekDates.has(day.date) ? "is-in-selected-week" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              aria-label={`${day.date}${count > 0 ? `，${count}场比赛` : ""}`}
              className={className}
              key={day.date}
              onClick={() => setPendingDate(day.date)}
              type="button"
            >
              <span className="match-calendar-day__number">{day.dayNumber}</span>
              <span className="match-calendar-day__count">{count > 0 ? `${count}场` : ""}</span>
            </button>
          );
        })}
      </div>

      <footer className="match-calendar-panel__footer">
        <button className="match-calendar-confirm-button" onClick={confirmDate} type="button">
          <CalendarCheck2 className="size-4" />
          选择日期
        </button>
        <p className="match-calendar-summary">
          <strong>{pendingDate}</strong>
          <span>{pendingCount > 0 ? `${pendingCount} 场已载入比赛` : "当前已载入数据中暂无比赛"}</span>
        </p>
        <button className="match-calendar-close-button" onClick={onClose} type="button">
          取消
        </button>
      </footer>
    </section>
  );
}
