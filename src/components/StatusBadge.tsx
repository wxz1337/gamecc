import type { MatchStatus } from "../../shared/match";
import { STATUS_LABELS } from "../constants/matches";

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = {
    running: { dot: "bg-emerald-500", text: "text-emerald-700", pulse: true },
    not_started: { dot: "bg-sky-500", text: "text-sky-700", pulse: false },
    finished: { dot: "bg-amber-400", text: "text-slate-600", pulse: false },
    postponed: { dot: "bg-amber-500", text: "text-amber-700", pulse: false },
    cancelled: { dot: "bg-rose-500", text: "text-rose-700", pulse: false }
  } as const;
  const tone = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
      <span className={`size-2 rounded-full ${tone.dot} ${tone.pulse ? "animate-pulse" : ""}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
