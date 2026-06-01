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
  const tabButtons = (
    <>
      {options.map((option) => {
        const selected = isSelected ? isSelected(option.value) : value === option.value;

        return (
          <button
            className={cn(
              "relative h-10 shrink-0 rounded-xl px-3 text-xs font-semibold transition-colors sm:px-4",
              wrap && "h-9 rounded-full px-3 sm:px-3.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033]/20",
              selected ? "text-white hover:text-white" : "text-slate-500 hover:text-slate-950"
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {selected ? (
              <motion.span
                className={cn(
                  "absolute inset-0 rounded-xl bg-[#172033] shadow-[0_10px_24px_rgba(23,32,51,0.14)] ring-1 ring-slate-900/10",
                  wrap && "rounded-full"
                )}
                layoutId={multiSelect ? `${label}-${option.value}-active-tab` : `${label}-active-tab`}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </>
  );

  if (inlineLabel) {
    return (
      <div className={cn("flex min-h-16 min-w-0 items-center gap-2 rounded-2xl", shrinkWrap && "justify-end")}>
        <span className="shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <div className={cn("flex min-w-0 items-center rounded-2xl border border-stone-200 bg-stone-100/70 p-1.5 shadow-inner shadow-stone-900/5", shrinkWrap ? "shrink-0" : "flex-1")}>
          <div className={cn("flex min-w-0 gap-1.5 overflow-x-auto scrollbar-none", !shrinkWrap && "flex-1")}>{tabButtons}</div>
          {trailingSlot ? <div className="ml-1.5 flex shrink-0 items-center gap-1.5 border-l border-stone-200 pl-1.5">{trailingSlot}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", wrap ? "flex flex-wrap items-center gap-x-3 gap-y-2" : "space-y-2")}>
      <p className={cn("px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500", wrap && "shrink-0")}>{label}</p>
      <div
        className={cn(
          "flex gap-1.5 scrollbar-none",
          wrap
            ? "flex-wrap overflow-visible"
            : "overflow-x-auto rounded-2xl border border-stone-200 bg-stone-100/70 p-1.5 shadow-inner shadow-stone-900/5"
        )}
      >
        {tabButtons}
      </div>
    </div>
  );
}
