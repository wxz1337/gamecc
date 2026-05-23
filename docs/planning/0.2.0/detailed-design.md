# 电竞赛程聚合网站 0.2.0 详细设计文档

## 1. 文档说明

本文档基于 `docs/planning/0.2.0/requirements.md` 编写，用于指导 0.2.0 的技术设计与实施。0.1.0 已完成按今天/明天和游戏项目查看赛程的 MVP；0.2.0 的设计重点是把现有能力升级为支持日期范围、历史赛果、多维筛选、赛程/结果视图和比赛详情的轻量赛事查询工具。

## 2. 设计目标

### 2.1 核心目标

- 支持最多 31 天的北京时间日期范围查询，包括历史比赛结果。
- 支持按游戏、状态、赛事、队伍、赛区、阶段和关键词组合筛选。
- 提供赛程和结果两个默认视图，并为各自设置合理默认日期、状态和排序。
- 在列表中展开比赛详情，展示比分、胜者、小局、赛事扩展字段、数据来源和更新时间。
- 继续兼容 0.1.0 的 `/api/matches?date=YYYY-MM-DD&game=all` 调用。
- 保持 PandaScore token 仅在后端使用，前端只访问本项目后端 API。
- 保留现有内存缓存和 stale 兜底策略，并扩展到范围查询与筛选场景。

### 2.2 设计边界

0.2.0 不实现用户系统、收藏关注、热门赛事权重、通知、日历订阅、多数据源融合、赔率预测、社区评论和复杂后台。直播与回放链接只在 PandaScore 字段稳定可用时作为展示增强，不作为交付阻塞项。

## 3. 总体架构

### 3.1 技术栈

- 前端：React + Vite + TypeScript。
- 后端：Node.js + Express + TypeScript。
- 数据源：PandaScore API。
- 缓存：沿用内存缓存，按查询范围和筛选条件生成缓存 key。
- 时间处理：沿用共享 `shared/date.ts` 的北京时间工具，并扩展范围换算和测试。

### 3.2 架构图

```text
Browser
  |
  | GET /api/matches?from=...&to=...&game=...&status=...&query=...
  v
React Frontend
  |
  | normalized query params
  v
Express Backend
  |
  | validate / normalize / cache lookup
  v
Match Service
  |
  | fetch by game + UTC range
  v
PandaScore Client
  |
  v
PandaScore API
```

### 3.3 主要改造点

- 路由层从只解析 `date`、`game` 扩展为解析完整 `MatchFilters`。
- 业务层从单日查询扩展为范围查询，并在服务端完成二次筛选、排序和 facets 生成。
- 共享模型扩展 `MatchesResponse`、`Match`、筛选类型、排序类型和 facets 类型。
- 前端从分散的 `date`、`game` state 升级为集中式筛选状态，并同步到 URL 查询参数。
- 列表卡片增加详情展开状态，不新增路由即可满足 MVP 详情能力。

## 4. 数据模型设计

### 4.1 共享类型

建议继续在 `shared/match.ts` 中维护前后端共享模型。

```ts
export type GameType = "cs2" | "valorant" | "lol";
export type GameFilter = "all" | GameType;

export type MatchStatus =
  | "all"
  | "not_started"
  | "running"
  | "finished"
  | "postponed"
  | "cancelled";

export type MatchSort =
  | "beginAt_asc"
  | "beginAt_desc"
  | "status"
  | "updatedAt_desc"
  | "league";

export type MatchView = "schedule" | "results";

export type MatchFilters = {
  view: MatchView;
  from: string;
  to: string;
  game: GameFilter;
  status: MatchStatus;
  query?: string;
  league?: string;
  team?: string;
  region?: string;
  stage?: string;
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type MatchFacets = {
  games: FacetOption[];
  statuses: FacetOption[];
  leagues: FacetOption[];
  teams: FacetOption[];
  regions: FacetOption[];
  stages: FacetOption[];
};
```

现有 `Match` 已包含 0.2.0 需要的大部分字段，建议补充：

```ts
export type Match = {
  id: string;
  game: GameType;
  name: string;
  league: string;
  leagueImageUrl?: string | null;
  tournament: string;
  serie?: string | null;
  stage?: string | null;
  tournamentType?: string | null;
  tournamentCountry?: string | null;
  tournamentRegion?: string | null;
  tournamentTier?: string | null;
  tournamentPrizepool?: string | null;
  hasBracket?: boolean | null;
  beginAt: string;
  endAt?: string | null;
  originalScheduledAt?: string | null;
  displayDate: string;
  displayTime: string;
  displayEndTime?: string | null;
  displayOriginalTime?: string | null;
  status: Exclude<MatchStatus, "all">;
  bestOf?: number | null;
  matchType?: string | null;
  rescheduled?: boolean | null;
  detailedStatsAvailable?: boolean | null;
  draw?: boolean | null;
  forfeit?: boolean | null;
  winnerTeamId?: string | null;
  winnerName?: string | null;
  score?: MatchScore[];
  games?: MatchGame[];
  teams: Team[];
  streamUrl?: string | null;
  replayUrl?: string | null;
  source: "pandascore";
  updatedAt: string;
};
```

### 4.2 响应结构

```ts
export type MatchesResponse = {
  date?: string;
  from: string;
  to: string;
  timezone: "Asia/Shanghai";
  filters: MatchFilters;
  sort: MatchSort;
  stale: boolean;
  updatedAt: string;
  total: number;
  facets: MatchFacets;
  matches: Match[];
};
```

兼容策略：

- 当请求携带旧参数 `date` 时，响应中保留 `date`，并设置 `from=date`、`to=date`。
- 前端 0.2.0 使用 `from`、`to` 和 `filters`；旧调用方仍可读取 `date`、`timezone`、`stale`、`updatedAt`、`matches`。

## 5. 接口设计

### 5.1 查询比赛列表

```http
GET /api/matches?from=2026-05-01&to=2026-05-24&game=lol&status=finished&query=edg&league=LPL&sort=beginAt_desc
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | string | 否 | 旧参数，合法 `YYYY-MM-DD`，等价于 `from=date&to=date` |
| `from` | string | 否 | 北京时间开始日期，合法 `YYYY-MM-DD` |
| `to` | string | 否 | 北京时间结束日期，合法 `YYYY-MM-DD` |
| `game` | string | 否 | `all`、`cs2`、`valorant`、`lol`，默认 `all` |
| `status` | string | 否 | `all`、`not_started`、`running`、`finished`、`postponed`、`cancelled` |
| `query` | string | 否 | 全局关键词，匹配队伍、赛事、联赛和游戏展示名 |
| `league` | string | 否 | 赛事或联赛名称筛选 |
| `team` | string | 否 | 队伍名称、缩写或别名筛选 |
| `region` | string | 否 | 赛区或国家筛选 |
| `stage` | string | 否 | 赛事阶段筛选 |
| `sort` | string | 否 | `beginAt_asc`、`beginAt_desc`、`status`、`updatedAt_desc`、`league` |
| `refresh` | string | 否 | `1` 时跳过未过期缓存 |

默认值：

- 未传 `date/from/to` 时，按赛程视图默认：今天到未来 7 天。
- `game` 默认 `all`。
- `status` 默认由视图决定；直接 API 调用无视图时默认 `all`。
- `sort` 默认由视图决定；直接 API 调用默认 `beginAt_asc`。

### 5.2 参数校验

新增或扩展 `shared/validators.ts`：

- `parseMatchQueryParams(query)`：解析并返回规范化后的 `MatchQuery`。
- `parseDateRange(date, from, to)`：兼容旧参数并校验范围。
- `parseMatchStatus(value)`：状态白名单校验。
- `parseMatchSort(value)`：排序白名单校验。
- `parseOptionalTextFilter(value, code)`：trim、空值归一、长度 1 到 80。

错误码建议维护在 `shared/errors.ts`：

| 错误码 | 场景 |
| --- | --- |
| `INVALID_DATE` | 单个日期格式错误 |
| `INVALID_DATE_RANGE` | `from` 晚于 `to` |
| `DATE_RANGE_TOO_LARGE` | 日期范围超过 31 天 |
| `INVALID_GAME` | 游戏类型非法 |
| `INVALID_STATUS` | 状态非法 |
| `INVALID_SORT` | 排序非法 |
| `INVALID_QUERY` | 全局关键词过长或非法 |
| `INVALID_FILTER` | 文本筛选参数过长或非法 |

## 6. 后端设计

### 6.1 路由层

`server/routes/matches.ts` 负责：

- 使用 `parseMatchQueryParams(req.query)` 生成规范化查询对象。
- 调用 `getMatches(query)`。
- 返回 `MatchesResponse`。
- 保留 `/api/matches` 路径，不新增版本化路径。

### 6.2 业务层

`server/services/matchService.ts` 建议拆出以下私有步骤：

```text
getMatches(query)
  normalize cache key
  read fresh cache unless refresh
  fetch raw matches by game + UTC date range
  map PandaScore raw matches to shared Match
  filter mapped matches
  sort filtered matches
  build facets from mapped matches in date range
  write cache
  return response
```

筛选规则：

- 游戏筛选优先决定请求哪些 PandaScore endpoint。
- 状态、关键词、赛事、队伍、赛区、阶段在服务端对归一化后的 `Match[]` 执行。
- 多个筛选条件之间为“并且”关系。
- 文本匹配统一大小写不敏感，建议按 `toLocaleLowerCase("en-US")` 处理。
- `query` 命中范围包括 `game` 展示名、`league`、`tournament`、`name`、队伍名、队伍缩写。
- `team` 只匹配参赛队伍名、缩写和后续可加入的别名。
- `region` 匹配 `tournamentRegion`、`tournamentCountry` 和队伍 `location`。
- `stage` 0.2.0 可先映射到 `stage`、`tournamentType` 或 `matchType`。

### 6.3 PandaScore 客户端

`server/services/pandascoreClient.ts` 从单日请求扩展为范围请求：

```ts
fetchPandaScoreMatches(game: GameType, range: {
  startUtc: Date;
  endUtc: Date;
}): Promise<PandaScoreMatch[]>
```

实现要求：

- 继续集中维护不同游戏的 endpoint 映射。
- 优先使用 PandaScore 支持的 `range[begin_at]` 或等价时间范围参数。
- 默认每页数量设为 API 允许的合理上限；若返回达到上限，预留分页循环。
- 保留请求超时、HTTP 错误、限流错误和 token 缺失处理。

### 6.4 映射层

`server/mappers/pandascoreMapper.ts` 已覆盖队伍、比分、胜者、小局、赛事地区、奖金池等字段。0.2.0 建议补充：

- `source: "pandascore"`。
- `updatedAt`：优先取 PandaScore 原始更新时间字段；缺失时使用本次映射时间。
- `serie`：保留系列赛名称，供详情展示和搜索。
- `stage`：优先从 tournament 或 serie 中可用字段映射；缺失为 `null`。
- `replayUrl`：若原始字段稳定存在则映射，否则为 `null`。
- 未知状态继续落到稳定可展示状态，但建议在内部保留 unknown 日志，便于后续完善映射。

### 6.5 排序

排序函数集中放在 `matchService` 或独立 `shared/matchSorting.ts`：

| sort | 规则 |
| --- | --- |
| `beginAt_asc` | 开赛时间升序 |
| `beginAt_desc` | 开赛时间降序 |
| `status` | `running`、`not_started`、`finished`、`postponed`、`cancelled` 后按时间升序 |
| `updatedAt_desc` | 数据更新时间降序，缺失时退回开赛时间降序 |
| `league` | 赛事/联赛名称升序，再按时间升序 |

### 6.6 Facets

facets 基于“日期范围 + 游戏请求范围”内的归一化比赛生成，建议在应用文本筛选前生成，以便用户看到当前范围可选项；状态和游戏 facets 可在应用筛选后附带 count，用于提示结果数量。MVP 可选择简单策略：基于最终筛选前集合生成全部 facets，保证下拉项不因自身筛选消失。

### 6.7 缓存设计

缓存 key 从 0.1.0 的 `matches:{date}:{game}` 扩展为：

```text
matches:v2:{from}:{to}:{game}:{status}:{query}:{league}:{team}:{region}:{stage}:{sort}
```

注意事项：

- 文本筛选参数先 trim 和小写后进入 key。
- `refresh=1` 跳过 fresh cache，但失败时仍允许读取 stale cache。
- 旧接口可继续写入新 key；无需维护旧 key，除非后续需要跨版本缓存复用。
- stale 响应必须设置 `stale: true`，并保留原 `updatedAt` 或增加 `servedAt` 可选字段。

## 7. 前端设计

### 7.1 页面结构

```text
Header
  站点名称 / 当前范围 / 刷新

Toolbar
  ViewTabs: 赛程 / 结果
  DateRangeControl: 快捷日期 + 自定义 from/to
  FilterBar: 游戏 / 状态 / 赛事 / 赛区 / 队伍 / 阶段 / 排序
  SearchBox: 全局关键词 + 清空
  ResetFiltersButton

Main
  StaleBanner
  MatchList
    MatchCard
      Summary
      DetailPanel
  Loading / Error / Empty

Footer
  数据来源 / 更新时间
```

### 7.2 状态管理

建议引入单一筛选状态对象：

```ts
type MatchPageState = {
  view: "schedule" | "results";
  from: string;
  to: string;
  game: GameFilter;
  status: MatchStatus;
  query: string;
  league: string;
  team: string;
  region: string;
  stage: string;
  sort: MatchSort;
};
```

状态来源优先级：

1. URL 查询参数。
2. 当前视图默认值。
3. 系统默认值。

视图默认：

- 赛程：今天到未来 7 天、`status=not_started` 或 UI 状态组“未开始/进行中”、`sort=beginAt_asc`。
- 结果：最近 7 天、`status=finished`、`sort=beginAt_desc`。

由于接口的 `status` MVP 为单选，而赛程默认需要“未开始 + 进行中”，有两种落地方式：

- 推荐：将前端赛程默认请求 `status=all`，并在后端/前端使用 `view=schedule` 语义筛出 `not_started` 和 `running`。
- 备选：扩展接口 `status` 支持逗号分隔多值。若采用此方案，需要同步更新需求和校验。

为避免扩大协议，0.2.0 推荐增加可选 `view=schedule|results` 参数，单选 `status` 保持白名单；用户手动选择状态后以用户状态为准。

### 7.3 URL 同步

前端需要把筛选状态写入 URL：

```text
/?view=results&from=2026-05-01&to=2026-05-24&game=lol&status=finished&query=edg&sort=beginAt_desc
```

规则：

- 默认值可省略，减少 URL 噪音。
- 文本参数为空时不写入 URL。
- 页面刷新后从 URL 恢复筛选。
- 点击“清空筛选”时保留当前 view，并恢复该 view 默认日期、状态和排序。

### 7.4 组件划分

```text
src/
  api/
    matches.ts
  components/
    ViewTabs.tsx
    DateRangeControl.tsx
    FilterBar.tsx
    SearchBox.tsx
    SortSelect.tsx
    MatchList.tsx
    MatchCard.tsx
    MatchDetailPanel.tsx
    StatusBadge.tsx
    StatePanels.tsx
  hooks/
    useMatchFilters.ts
    useMatches.ts
  utils/
    date.ts
    matchFormatters.ts
    urlState.ts
```

职责：

- `useMatchFilters`：管理筛选状态、视图默认值、URL 读写和 reset。
- `useMatches`：接收完整筛选对象，执行请求、取消过期请求、处理 refresh。
- `api/matches.ts`：将筛选对象转换为查询字符串，并解析 API 错误。
- `MatchCard`：展示摘要信息和详情入口。
- `MatchDetailPanel`：展示比分、胜者、小局、赛事扩展字段、数据来源和更新时间。

### 7.5 空状态和错误状态

空状态文案由当前筛选决定：

- 无关键词且无额外筛选：`当前时间范围没有已收录比赛。`
- 有筛选条件：`当前筛选条件下没有比赛。`
- 有搜索关键词：`没有找到匹配“{query}”的比赛。`
- 范围过大错误：直接展示后端错误文案，并提示最大 31 天。

stale 数据：

- 继续展示列表。
- 在列表上方显示 `数据可能不是最新，已展示缓存内容。`
- 更新时间显示缓存响应的 `updatedAt`。

### 7.6 详情展示

详情展开字段：

- 基础：游戏、赛事、系列赛、阶段、状态、BO、开始/结束时间。
- 结果：总比分、胜者、小局列表、弃权/平局标记。
- 扩展：赛区、国家、奖金池、等级、淘汰赛签表、赛后统计可用性。
- 链接：直播链接、回放链接，缺失时隐藏。
- 元信息：数据来源、数据更新时间。

展示规则：

- 不渲染 `null`、`undefined`。
- 缺失但用户会期待的字段显示 `暂无数据`。
- 延期和取消状态在摘要和详情中都必须明确展示。

## 8. 时间与日期设计

日期仍以 `Asia/Shanghai` 为基准。

范围换算示例：

```text
from=2026-05-01
to=2026-05-24

北京时间开始：2026-05-01 00:00:00
北京时间结束：2026-05-24 23:59:59.999
UTC 开始：2026-04-30T16:00:00.000Z
UTC 结束：2026-05-24T15:59:59.999Z
```

需要扩展 `shared/date.ts`：

- `getBeijingDateRangeUtc(from, to)`。
- `getBeijingTodayDateString()` 可继续在前端 utils 使用。
- `addBeijingDays(date, days)` 或等价工具，用于快捷范围。
- `getDateSpanDays(from, to)`，用于 31 天限制。

## 9. 测试方案

### 9.1 后端单元测试

重点覆盖：

- `date` 兼容 `from/to`。
- 日期范围合法性和 31 天限制。
- 状态、排序、文本筛选参数校验。
- 北京时间范围转 UTC。
- 状态映射：延期、取消、未知状态。
- 关键词命中队伍、赛事、联赛、游戏展示名。
- 赛事、队伍、赛区、阶段定向筛选。
- 排序：升序、降序、状态优先、更新时间、赛事名。
- facets 生成。
- 缓存 fresh、refresh、stale 兜底。

### 9.2 集成测试

`server/app.test.ts` 增加：

- 旧接口 `/api/matches?date=YYYY-MM-DD&game=all` 仍返回 200。
- 新接口范围查询返回 `from`、`to`、`filters`、`total`、`facets`。
- 非法范围返回 `INVALID_DATE_RANGE`。
- 超出 31 天返回 `DATE_RANGE_TOO_LARGE`。
- 非法状态返回 `INVALID_STATUS`。
- 非法排序返回 `INVALID_SORT`。

### 9.3 前端验证

重点人工和组件级验证：

- 首次打开为赛程视图。
- 切换结果视图后日期、状态、排序默认值正确。
- 手动选择日期或状态后，视图切换不覆盖用户选择。
- 搜索和筛选可以组合生效。
- URL 刷新后恢复当前筛选。
- 详情展开不破坏移动端布局。
- loading、error、empty、stale 状态展示准确。

最终仍需通过：

```bash
npm test
npm run build
```

## 10. 实施计划

### 10.1 阶段一：协议和后端范围查询

- 扩展共享类型和错误码。
- 新增完整查询参数解析。
- 扩展北京时间日期范围工具。
- 改造 PandaScore 客户端支持范围查询。
- 保留旧接口兼容测试。

### 10.2 阶段二：筛选、排序和 facets

- 服务端实现状态、关键词、赛事、队伍、赛区、阶段筛选。
- 实现排序策略。
- 实现 facets 生成。
- 扩展缓存 key 和 stale 兜底。
- 补充后端单元测试和集成测试。

### 10.3 阶段三：前端查询体验

- 引入集中筛选状态和 URL 同步。
- 实现视图切换、日期范围、筛选条、搜索、排序、清空筛选。
- 改造 `useMatches` 和 API 请求封装。
- 完成空状态和错误状态分场景文案。

### 10.4 阶段四：详情和验收

- 实现卡片详情展开。
- 展示比分、胜者、小局、赛事扩展字段、数据来源和更新时间。
- 完成桌面和移动端人工验收。
- 运行 `npm test` 和 `npm run build`。

## 11. 风险与取舍

- PandaScore 不同游戏字段完整度不一致：详情面板需要允许字段缺失，并以隐藏或 `暂无数据` 处理。
- 赛程视图默认需要多个状态，而需求中的 `status` 是单选：建议引入 `view` 语义解决默认组合状态，用户手动选择状态后以用户选择为准。
- 31 天范围内 `game=all` 可能触发分页或限流：MVP 先限制范围并保留分页扩展点，必要时在后续小版本优化。
- facets 生成策略可能影响体验：MVP 先采用简单稳定策略，避免筛选项因自身条件闪烁。
- `updatedAt` 原始字段若缺失：使用服务端响应生成时间兜底，文案应表达为“数据更新时间”而不是外部源精确更新时间。

## 12. 验收清单

- 可以查询任意合法单日比赛。
- 可以查询最多 31 天日期范围。
- 可以查询过去比赛结果，并按时间倒序展示。
- 可以按游戏、状态、赛事、队伍关键词组合筛选。
- 全局关键词能命中队伍、赛事、联赛和游戏展示名。
- 可以打开比赛详情并看到 BO、比分、状态、数据来源和更新时间。
- 延期和取消比赛不会被展示为普通未开始。
- 旧接口调用方式仍可用。
- 页面刷新后保留当前筛选条件。
- 无结果、加载失败、stale 数据均有明确提示。
- 非法日期范围、非法状态、非法排序返回明确错误码。
- `npm test` 通过。
- `npm run build` 通过。
- 桌面和移动端人工验收通过。
