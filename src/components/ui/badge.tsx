import * as React from "react";
import { cn } from "../../lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "dark";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-[rgba(255,255,255,0.035)] text-[var(--text-secondary)] ring-[var(--border-subtle)]",
  green: "bg-[rgba(114,184,143,0.1)] text-[var(--status-success)] ring-[rgba(114,184,143,0.16)]",
  amber: "bg-[rgba(217,173,106,0.1)] text-[var(--status-warning)] ring-[rgba(217,173,106,0.18)]",
  red: "bg-[rgba(255,77,94,0.12)] text-[var(--status-live)] ring-[rgba(255,77,94,0.24)]",
  blue: "bg-[rgba(88,183,255,0.12)] text-[var(--status-upcoming)] ring-[rgba(88,183,255,0.24)]",
  dark: "bg-[var(--brand-soft)] text-[var(--text-primary)] ring-[var(--brand-border)]"
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
