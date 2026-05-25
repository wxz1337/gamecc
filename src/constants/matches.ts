import type { GameFilter, MatchStatus, MatchStatusFilter, MatchTier } from "../../shared/match";

export const GAME_FILTER_OPTIONS: Array<{ label: string; value: GameFilter }> = [
  { label: "全部", value: "all" },
  { label: "LoL", value: "lol" },
  { label: "CS2", value: "cs2" },
  { label: "VALORANT", value: "valorant" }
];

export const REGION_FILTER_OPTIONS: Record<GameFilter, Array<{ label: string; value: string }>> = {
  all: [
    { label: "全部赛区", value: "" },
    { label: "中国赛区", value: "CN" },
    { label: "韩国赛区", value: "KR" },
    { label: "欧洲赛区", value: "Europe" },
    { label: "美洲赛区", value: "Americas" },
    { label: "太平洋赛区", value: "Pacific" }
  ],
  lol: [
    { label: "全部赛区", value: "" },
    { label: "LPL", value: "LPL" },
    { label: "LCK", value: "LCK" },
    { label: "LEC", value: "LEC" },
    { label: "LCS", value: "LCS" },
    { label: "PCS", value: "PCS" },
    { label: "VCS", value: "VCS" }
  ],
  cs2: [
    { label: "全部赛区", value: "" },
    { label: "欧洲", value: "Europe" },
    { label: "美洲", value: "Americas" },
    { label: "亚洲", value: "Asia" },
    { label: "国际赛", value: "International" }
  ],
  valorant: [
    { label: "全部赛区", value: "" },
    { label: "VCT CN", value: "CN" },
    { label: "Pacific", value: "Pacific" },
    { label: "EMEA", value: "EMEA" },
    { label: "Americas", value: "Americas" }
  ]
};

export const TIER_FILTER_OPTIONS: Array<{ label: string; value: "all" | MatchTier }> = [
  { label: "全部级别", value: "all" },
  { label: "S级", value: "S" },
  { label: "A级", value: "A" },
  { label: "B级", value: "B" },
  { label: "C级", value: "C" }
];

export const MATCH_STATUS_FILTER_OPTIONS: Array<{ label: string; value: MatchStatusFilter }> = [
  { label: "进行中&未开始", value: "running" },
  { label: "已结束", value: "finished" }
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
