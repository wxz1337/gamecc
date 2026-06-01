import * as React from "react";
import { cn } from "../../lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "dark";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-white/80 text-slate-600 ring-stone-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  dark: "bg-slate-900 text-white ring-slate-900"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset backdrop-blur",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
