import * as React from "react";
import { cn } from "../../lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "dark";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-zinc-100/80 text-zinc-600 ring-zinc-200/50",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-200/50",
  amber: "bg-amber-50 text-amber-600 ring-amber-200/50",
  red: "bg-rose-50 text-rose-600 ring-rose-200/50",
  blue: "bg-sky-50 text-sky-600 ring-sky-200/50",
  dark: "bg-zinc-900 text-white ring-zinc-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
