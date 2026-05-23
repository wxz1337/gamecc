import type { GameFilter, MatchStatus } from "../../shared/match";

export const GAME_FILTER_OPTIONS: Array<{ label: string; value: GameFilter }> = [
  { label: "全部", value: "all" },
  { label: "CS2", value: "cs2" },
  { label: "VALORANT", value: "valorant" },
  { label: "LoL", value: "lol" }
];

export const STATUS_LABELS: Record<MatchStatus, string> = {
  not_started: "未开始",
  running: "进行中",
  finished: "已结束",
  postponed: "已延期",
  cancelled: "已取消"
};

export const GAME_LABELS: Record<Exclude<GameFilter, "all">, string> = {
  cs2: "CS2",
  valorant: "VALORANT",
  lol: "LoL"
};
