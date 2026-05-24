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
  multiSelect?: boolean;
};

export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  isSelected,
  multiSelect = false
}: FilterTabsProps<T>) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto rounded-lg bg-zinc-100 p-1 scrollbar-none">
        {options.map((option) => {
          const selected = isSelected ? isSelected(option.value) : value === option.value;

          return (
            <button
              className={cn(
                "relative h-9 shrink-0 rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors",
                "hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10",
                selected && "text-zinc-950"
              )}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {selected ? (
                <motion.span
                  className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-zinc-200"
                  layoutId={multiSelect ? `${label}-${option.value}-active-tab` : `${label}-active-tab`}
                  transition={{ duration: 0.16, ease: "easeOut" }}
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
