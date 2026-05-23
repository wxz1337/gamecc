import type { MatchStatus } from "../../shared/match";
import { STATUS_LABELS } from "../constants/matches";

export function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>;
}
