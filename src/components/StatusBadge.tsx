import type { MatchStatus } from "../../shared/match";
import { STATUS_LABELS } from "../constants/matches";

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = {
    running: { dot: "bg-[var(--status-live)]", text: "text-[var(--status-live)]", pulse: true },
    not_started: { dot: "bg-[var(--status-upcoming)]", text: "text-[var(--status-upcoming)]", pulse: false },
    finished: { dot: "bg-[var(--status-finished)]", text: "text-[var(--text-secondary)]", pulse: false },
    postponed: { dot: "bg-[var(--status-warning)]", text: "text-[var(--status-warning)]", pulse: false },
    cancelled: { dot: "bg-[var(--status-danger)]", text: "text-[var(--status-danger)]", pulse: false }
  } as const;
  const tone = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
      <span className={`size-2 rounded-full ${tone.dot} ${tone.pulse ? "animate-pulse" : ""}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
