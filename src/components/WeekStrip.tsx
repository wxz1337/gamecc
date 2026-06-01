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
  const renderDateButtons = (layoutId: string) => dates.map((date) => {
    const day = new Date(`${date}T00:00:00.000Z`);
    const weekday = WEEKDAY_LABELS[day.getUTCDay()];
    const selected = selectedDate === date;

    return (
      <motion.button
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative min-w-0 overflow-hidden rounded-xl px-2 py-2.5 text-center transition-all duration-200 ease-out sm:rounded-2xl sm:py-3",
          "hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
          selected ? "text-zinc-900" : "text-zinc-500 hover:bg-zinc-100/50 hover:text-zinc-800"
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
            className="absolute inset-0 rounded-xl border border-zinc-200/50 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] sm:rounded-2xl"
            layoutId={layoutId}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        ) : null}
        <span className={cn("relative z-10 block text-[11px] font-bold", selected ? "text-zinc-500" : "text-zinc-400")}>
          {date === today ? "今天" : weekday}
        </span>
        <strong className={cn("relative z-10 mt-1 block truncate text-base font-bold", selected ? "text-zinc-900" : "text-zinc-600")}>
          {date.slice(5).replace("-", ".")}
        </strong>
      </motion.button>
    );
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Button aria-label="前一天" onClick={() => onMoveDate(-1)} size="icon" type="button" variant="outline">
          <ChevronLeft className="size-4" />
        </Button>
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

      <div className="hidden lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-3">
        <Button aria-label="前一天" onClick={() => onMoveDate(-1)} size="icon" type="button" variant="outline">
          <ChevronLeft className="size-4" />
        </Button>

        <div className="grid grid-cols-7 gap-2">{renderDateButtons("selected-date-pill-desktop")}</div>

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

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:hidden">{renderDateButtons("selected-date-pill-mobile")}</div>
    </div>
  );
}
