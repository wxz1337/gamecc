import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

type FilterTabsProps<T extends string> = {
  label: string;
  options: Array<FilterOption<T>>;
  value: T;
  onChange: (value: T) => void;
  isSelected?: (value: T) => boolean;
  inlineLabel?: boolean;
  multiSelect?: boolean;
  shrinkWrap?: boolean;
  trailingSlot?: ReactNode;
  wrap?: boolean;
};

export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  isSelected,
  inlineLabel = false,
  multiSelect = false,
  shrinkWrap = false,
  trailingSlot,
  wrap = false
}: FilterTabsProps<T>) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {options.map((option) => {
          const selected = isSelected ? isSelected(option.value) : value === option.value;

          return (
            <button
              className={cn(
                "relative h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              )}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {selected ? (
                <motion.span
                  className="absolute inset-0 rounded-full bg-[var(--brand-soft)] ring-1 ring-[var(--brand-border)]"
                  layoutId={multiSelect ? `${label}-${option.value}-active-tab` : `${label}-active-tab`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
