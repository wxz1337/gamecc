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
  compact?: boolean;
  isSelected?: (value: T) => boolean;
  inlineLabel?: boolean;
  multiSelect?: boolean;
  optionIcon?: (value: T) => ReactNode;
  shrinkWrap?: boolean;
  trailingSlot?: ReactNode;
  wrap?: boolean;
};

export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
  isSelected,
  inlineLabel = false,
  multiSelect = false,
  optionIcon,
  shrinkWrap = false,
  trailingSlot,
  wrap = false
}: FilterTabsProps<T>) {
  return (
    <div className={cn("min-w-0", inlineLabel ? "flex items-center gap-2.5" : "space-y-1.5", shrinkWrap && "w-auto")}>
      <p className={cn("px-1 text-xs font-medium text-[var(--text-tertiary)]", !inlineLabel && "mb-1.5")}>{label}</p>
      <div className={cn("flex gap-1.5 overflow-x-auto scrollbar-none", wrap ? "flex-wrap overflow-visible pb-0" : "pb-1.5", shrinkWrap && "w-auto")}>
        {options.map((option) => {
          const selected = isSelected ? isSelected(option.value) : value === option.value;

          return (
            <button
              className={cn(
                "relative h-9 shrink-0 rounded-full text-[13px] font-medium transition-all duration-200",
                compact ? "px-2.5" : "px-3.5",
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
              <span className={cn("relative z-10 inline-flex items-center", compact ? "gap-1.5" : "gap-2")}>
                {optionIcon ? <span className="grid shrink-0 place-items-center">{optionIcon(option.value)}</span> : null}
                <span>{option.label}</span>
              </span>
            </button>
          );
        })}
        {trailingSlot}
      </div>
    </div>
  );
}
