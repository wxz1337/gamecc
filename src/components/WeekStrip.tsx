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
                "relative min-h-16 min-w-0 overflow-hidden rounded-2xl border px-3 py-2 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033]/20",
                selected
                  ? "border-[#172033]/20 text-white shadow-[0_12px_28px_rgba(23,32,51,0.16)]"
                  : "border-stone-200 bg-white/72 text-slate-700 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
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
                  className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,#172033,#31415f)]"
                  layoutId="selected-date-pill"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null}
              <span className={cn("relative z-10 block text-[11px] font-bold uppercase tracking-[0.16em]", selected ? "text-slate-200" : "text-slate-500")}>
                {date === today ? "今天" : weekday}
              </span>
              <strong className="font-display relative z-10 mt-1 block truncate text-base font-bold sm:text-[1.05rem]">
                {date.slice(5).replace("-", ".")}
              </strong>
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
