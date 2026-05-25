import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

type WeekStripProps = {
  dates: string[];
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMoveDate: (days: number) => void;
  onOpenCalendar: () => void;
  isCalendarOpen: boolean;
};

export function WeekStrip({
  dates,
  today,
  selectedDate,
  onSelectDate,
  onMoveDate,
  onOpenCalendar,
  isCalendarOpen
}: WeekStripProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
      <Button aria-label="前一天" onClick={() => onMoveDate(-1)} size="icon" type="button" variant="outline">
        <ChevronLeft className="size-4" />
      </Button>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {dates.map((date) => {
          const day = new Date(`${date}T00:00:00.000Z`);
          const weekday = WEEKDAY_LABELS[day.getUTCDay()];
          const selected = selectedDate === date;

          return (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-lg border bg-white px-2 py-3 text-left transition-all duration-150",
                "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm",
                selected ? "border-zinc-950 text-white shadow-sm" : "border-zinc-200 text-zinc-700"
              )}
              initial={{ opacity: 0, y: 6 }}
              key={date}
              layout
              onClick={() => onSelectDate(date)}
              transition={{ duration: 0.16, ease: "easeOut" }}
              type="button"
            >
              {selected ? (
                <motion.span
                  className="absolute inset-0 rounded-lg bg-zinc-950"
                  layoutId="selected-date-pill"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              ) : null}
              <span className={cn("relative z-10 block text-xs font-medium", selected ? "text-zinc-300" : "text-zinc-500")}>
                {date === today ? "今天" : weekday}
              </span>
              <strong className="relative z-10 mt-1 block truncate text-base">{date.slice(5).replace("-", ".")}</strong>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button aria-label="后一天" onClick={() => onMoveDate(1)} size="icon" type="button" variant="outline">
          <ChevronRight className="size-4" />
        </Button>
        <Button
          className={cn(isCalendarOpen && "ring-2 ring-zinc-950/10")}
          onClick={onOpenCalendar}
          type="button"
          variant="secondary"
        >
          <CalendarDays className="size-4" />
          选择日期
        </Button>
      </div>
    </div>
  );
}
