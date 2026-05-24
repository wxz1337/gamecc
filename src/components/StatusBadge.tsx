import type { MatchStatus } from "../../shared/match";
import { STATUS_LABELS } from "../constants/matches";
import { AlertTriangle, Ban, CheckCircle2, CircleDashed, Radio } from "lucide-react";
import { Badge } from "./ui/badge";

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = {
    not_started: { icon: CircleDashed, tone: "blue" },
    running: { icon: Radio, tone: "green" },
    finished: { icon: CheckCircle2, tone: "neutral" },
    postponed: { icon: AlertTriangle, tone: "amber" },
    cancelled: { icon: Ban, tone: "red" }
  } as const;
  const Icon = config[status].icon;

  return (
    <Badge tone={config[status].tone}>
      <Icon className="size-3.5" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
