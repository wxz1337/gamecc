# Vibe Coding Prompt v0.2.0：电竞赛程聚合网站

你是本项目的主 Agent，负责在无人参与的情况下，将当前电竞赛程聚合网站从 `0.1.0` 升级到 `0.2.0`。你需要持续跟踪整体进度，按模块生成并调度子 Agent 完成实现、测试、联调和验收，直到版本达到 `0.2.0` 的验收标准。

开始后必须先检查当前仓库状态。仓库可能已经包含 `0.1.0` 的完整实现、`0.2.0` 的部分产物、依赖安装结果或未提交改动；不要重复初始化项目，不要覆盖已有有效实现，不要回滚用户或其他 Agent 已经完成的改动。对已经满足验收项的任务，标记为完成并继续下一个未完成任务。

## 1. 项目背景

当前项目 `0.1.0` 已经实现个人可用的电竞赛程聚合 MVP：用户可以按北京时间查看今天和明天的 CS2、VALORANT、LoL 赛程，按游戏筛选，并通过后端代理 PandaScore API 获取数据。

`0.2.0` 的目标是把产品从“今日/明日赛程列表”升级为“可查询、可筛选、可回溯的赛事信息工具”。用户应能查询未来赛程、历史赛果、赛事和队伍相关比赛，并在列表中查看比赛详情。

项目定位仍是个人效率工具，不是公开运营网站。不做用户系统、社区、博彩、赔率、预测、复杂后台、通知、日历订阅、收藏关注或复杂推荐。

## 2. 输入文档

主 Agent 和所有子 Agent 必须以以下文档为准：

- `docs/planning/0.2.0/requirements.md`：需求文档，定义 0.2.0 的产品目标、功能范围、接口需求、前端交互和验收标准。
- `docs/planning/0.2.0/detailed-design.md`：详细设计，定义共享模型、API、后端服务、缓存、前端状态、URL 同步、详情展示、测试方案和风险取舍。
- `docs/planning/0.2.0/implementation-tasks.md`：任务划分，定义 M1 到 M9 的模块顺序、每个任务的目标、上下文、产出和验收项。

执行任何任务前，子 Agent 必须阅读对应任务说明，以及该任务在需求文档和详细设计中的相关章节。不要只凭记忆实现。

## 3. 技术目标

继续使用当前项目技术栈：

- 前端：React + Vite + TypeScript。
- 后端：Node.js + Express + TypeScript。
- 数据源：PandaScore API。
- 缓存：内存缓存，扩展到范围查询与筛选参数。
- 时间处理：以北京时间 `Asia/Shanghai` 为业务基准，后端请求外部 API 时转换为 UTC 范围。

核心链路：

```text
Browser
  -> React Frontend
  -> Express Backend
  -> Match Service
  -> Cache Layer
  -> PandaScore Client
  -> PandaScore API
```

前端不得读取或暴露 PandaScore token。PandaScore token 只能在后端使用。

## 4. 0.2.0 必须完成的范围

P0 必须完成：

- 日期范围筛选，包括历史比赛查询。
- 最多 31 天的北京时间日期范围查询。
- 任意合法单日查询，不限今天和明天。
- 比赛状态筛选：未开始、进行中、已结束、延期、取消。
- 多维筛选：游戏项目、赛事名称、队伍关键词。
- 全局关键词搜索：命中队伍、赛事、联赛、游戏展示名。
- 赛程和结果两个默认视图。
- 赛程视图默认今天到未来 7 天、时间升序。
- 结果视图默认最近 7 天、已结束、时间降序。
- 比赛详情展开或详情面板。
- 详情展示 BO、比分、胜者、小局、状态、数据来源、更新时间。
- 延期和取消比赛必须明确展示，不能被误展示为普通未开始。
- URL 查询参数保留当前筛选状态，刷新页面后可恢复。
- 旧接口兼容：`/api/matches?date=YYYY-MM-DD&game=all` 不应被破坏。
- 非法日期范围、非法状态、非法排序返回明确错误码。
- 加载、错误、空状态、stale 缓存提示清晰。
- 桌面和移动端布局可用。
- `npm test` 通过。
- `npm run build` 通过。

P1 可在不影响 P0 和整体稳定性的前提下完成：

- 赛区/地区筛选。
- 赛事阶段展示和筛选。
- 快捷日期项：本周、下周、最近 30 天、过去比赛、未来赛程。
- 排序方式：状态优先、按更新时间、按赛事名称。
- 直播或回放链接展示，如果 PandaScore 字段稳定可用。

P2 暂缓，不应塞入本版本：

- 收藏或关注游戏、赛事、队伍。
- 热门赛事和我的关注独立首页标签。
- 开赛提醒。
- 日历订阅。
- 多数据源融合。
- 赛事重要程度或个性化推荐。

## 5. 关键接口和数据模型

`0.2.0` 扩展现有接口，不新增版本化路径：

```http
GET /api/matches?from=2026-05-01&to=2026-05-24&game=lol&status=finished&query=edg&league=LPL&sort=beginAt_desc
GET /api/matches?date=2026-05-24&game=all
```

请求参数：

- `date`：旧参数，合法 `YYYY-MM-DD`，等价于 `from=date&to=date`。
- `from`：北京时间开始日期，合法 `YYYY-MM-DD`。
- `to`：北京时间结束日期，合法 `YYYY-MM-DD`。
- `view`：`schedule` 或 `results`，用于视图默认状态。
- `game`：`all`、`cs2`、`valorant`、`lol`。
- `status`：`all`、`not_started`、`running`、`finished`、`postponed`、`cancelled`。
- `query`：全局关键词，匹配队伍、赛事、联赛、游戏展示名。
- `league`：赛事或联赛名称筛选。
- `team`：队伍名称、缩写或别名筛选。
- `region`：赛区或国家筛选。
- `stage`：赛事阶段筛选。
- `sort`：`beginAt_asc`、`beginAt_desc`、`status`、`updatedAt_desc`、`league`。
- `refresh`：`1` 时跳过 fresh cache，失败时仍允许 stale 兜底。

共享类型应以详细设计为准，核心结构包括：

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

注意：实体比赛的 `status` 不能是 `all`。如果需要，拆分 `MatchStatus` 与实体状态类型。

## 6. 时间与日期规则

所有日期筛选以北京时间为准。

示例：

```text
from=2026-05-01
to=2026-05-24

北京时间开始：2026-05-01 00:00:00
北京时间结束：2026-05-24 23:59:59.999
UTC 开始：2026-04-30T16:00:00.000Z
UTC 结束：2026-05-24T15:59:59.999Z
```

要求：

- 后端接收 `YYYY-MM-DD`，按北京时间解释。
- 请求 PandaScore 时使用 UTC ISO 时间范围。
- 内部 `beginAt` 保留 UTC ISO 字符串。
- 响应提供北京时间展示字段。
- 排序使用 `beginAt` 的 UTC 时间戳。
- 日期范围最多 31 天。
- 必须测试单日、范围、31 天边界和非法范围。

## 7. 主 Agent 职责

主 Agent 负责：

- 阅读三份 0.2.0 输入文档和当前源码。
- 检查 git 状态和现有实现进度。
- 建立 M1 到 M9 的任务进度表。
- 按 `implementation-tasks.md` 的顺序推进。
- 为每个任务生成子 Agent 指令。
- 控制每个子 Agent 的任务边界，避免无关重构。
- 审核子 Agent 输出是否满足验收项。
- 运行必要检查，包括相关单元测试、集成测试、`npm test` 和 `npm run build`。
- 记录完成项、风险、假设、验证结果和下一步。
- 最终完成 0.2.0 验收。

由于整个过程不会有人工参与，主 Agent 遇到不明确但不阻塞的问题时，应选择最符合文档、现有代码和工程常规的保守方案，并在进度记录中写明假设。只有在无法继续实现、会造成明显错误实现或需要真实密钥等外部输入时，才将问题记录为阻塞项；不要等待人工确认 UI 文案、颜色、目录命名等低风险选择。

## 8. 子 Agent 调度原则

每个子 Agent 默认只处理一个明确任务，除非同一模块内相邻任务非常小且依赖紧密。

推荐执行顺序：

```text
M1 共享协议与校验
  -> M2 数据源映射与范围拉取
  -> M3 后端查询服务
  -> M4 后端测试
  -> M5 前端数据与 URL 状态
  -> M6 前端筛选 UI
  -> M7 比赛列表与详情
  -> M8 状态体验与响应式
  -> M9 联调与发布验收
```

允许并行的条件：

- 共享协议稳定后，后端测试和前端 UI 的部分工作可并行。
- 并行任务不得修改同一组文件。
- 并行后必须由主 Agent 统一检查冲突、类型错误和集成结果。

不要跨后端、前端、测试模块随意混合任务。不要把 P2 能力提前实现为当前版本内容。

## 9. 子 Agent 通用 Prompt 模板

主 Agent 生成子 Agent 时使用下面模板：

```text
你是本项目的子 Agent，只负责完成 docs/planning/0.2.0/implementation-tasks.md 中的 T{编号}：{任务名称}。

必读上下文：
- docs/planning/0.2.0/implementation-tasks.md 中 T{编号} 的完整任务说明。
- docs/planning/0.2.0/requirements.md 中与该任务相关的章节。
- docs/planning/0.2.0/detailed-design.md 中与该任务相关的章节。
- 当前任务涉及的现有源码文件。

项目目标：
- 将电竞赛程聚合网站升级到 0.2.0。
- 支持日期范围、历史赛果、多维筛选、赛程/结果视图和比赛详情。
- 保持 PandaScore token 只在后端使用。
- 保持旧接口 /api/matches?date=YYYY-MM-DD&game=all 兼容。

任务边界：
- 只完成 T{编号} 的范围。
- 不做无关重构。
- 不实现后续模块能力，除非当前任务无法独立验收。
- 不提交真实 PandaScore token。
- 不在前端暴露 token。
- 不破坏已经通过的旧能力和测试。

实现要求：
- 遵循 requirements.md、detailed-design.md、implementation-tasks.md。
- 保持类型清晰，前后端共享类型优先放在 shared。
- 错误响应使用统一格式。
- 对缺失或不稳定外部字段做安全处理。
- 日期和时间统一以北京时间解释，以 UTC 范围请求外部 API。
- 修改完成后运行相关检查，或说明无法运行的原因。

输出要求：
- 列出修改文件。
- 说明实现内容。
- 说明验证方式和结果。
- 说明剩余风险或下一步建议。
```

## 10. 具体任务执行计划

### M1 共享协议与校验

目标：扩展 `0.2.0` 类型、错误码、日期范围和查询参数解析。

任务：

- T1.1 扩展共享类型。
- T1.2 扩展错误码。
- T1.3 实现北京时间范围工具。
- T1.4 实现查询参数解析。
- T1.5 补齐共享校验测试。

验收重点：

- `Match.status` 不允许出现 `all`。
- `MatchesResponse` 同时支持新字段和旧 `date` 兼容字段。
- `2026-05-01` 到 `2026-05-24` 的 UTC 范围转换正确。
- 旧请求 `date=2026-05-24&game=all` 可解析为同日 `from/to`。
- 非法范围、超过 31 天、非法状态、非法排序返回正确错误码。

### M2 数据源映射与范围拉取

目标：支持 PandaScore 日期范围请求，补齐详情字段映射。

任务：

- T2.1 扩展 PandaScore 范围请求。
- T2.2 扩展 PandaScore 原始类型。
- T2.3 补齐比赛详情映射。
- T2.4 更新 mapper 测试样例。

验收重点：

- PandaScore client 接收 `{ startUtc, endUtc }`。
- 保留 token 缺失、请求失败、超时和限流错误处理。
- 已结束比赛可展示比分和胜者。
- 延期或取消比赛不会映射为普通未开始。
- 缺失字段统一输出 `null` 或空数组，避免前端出现 `undefined`。

### M3 后端查询服务

目标：支持范围查询、筛选、排序、facets、缓存和旧接口兼容。

任务：

- T3.1 改造路由使用完整查询对象。
- T3.2 改造 matchService 支持范围查询。
- T3.3 实现服务端筛选。
- T3.4 实现排序策略。
- T3.5 生成 facets。
- T3.6 扩展缓存 key 和 stale 兜底。

验收重点：

- 旧请求和新请求都能进入 service。
- `total` 等于最终返回的 matches 数量。
- 筛选条件之间为“并且”关系。
- `query` 大小写不敏感，并命中游戏展示名、league、tournament、serie、name、队伍名、队伍缩写。
- 状态优先顺序为进行中、未开始、已结束、延期、取消。
- facets 不包含空字符串、`null` 或 `undefined`。
- 不同筛选条件不会互相命中缓存。
- 外部请求失败且有旧缓存时返回 `stale: true`。

### M4 后端测试

目标：覆盖参数、筛选、排序、facets、缓存和兼容行为。

任务：

- T4.1 补充路由兼容测试。
- T4.2 补充参数错误测试。
- T4.3 补充筛选和排序测试。
- T4.4 补充 facets 测试。
- T4.5 补充缓存和 stale 测试。

验收重点：

- `/api/matches?date=YYYY-MM-DD&game=all` 仍返回 200。
- 新接口返回 `from`、`to`、`filters`、`sort`、`total`、`facets`。
- 每个参数错误返回对应 code。
- 筛选、排序、facets、缓存和 stale 测试通过。

### M5 前端数据与 URL 状态

目标：建立集中筛选状态、URL 同步和新接口请求封装。

任务：

- T5.1 扩展前端 API 请求封装。
- T5.2 实现 URL 状态工具。
- T5.3 实现筛选状态 hook。
- T5.4 改造 `useMatches`。
- T5.5 接入 App 顶层状态。

验收重点：

- 能生成 `from/to/game/status/query/league/team/region/stage/sort/view` 查询字符串。
- URL 可恢复 `?view=results&from=2026-05-01&to=2026-05-24&game=lol&status=finished`。
- 首次进入默认赛程视图。
- 结果视图默认最近 7 天、已结束、时间降序。
- 用户手动选择日期或状态后，视图切换不强行覆盖用户选择。
- 快速切换筛选不会展示旧结果。

### M6 前端筛选 UI

目标：实现赛程/结果视图、日期范围、筛选、搜索、排序和清空。

任务：

- T6.1 实现赛程/结果视图切换。
- T6.2 实现日期范围控件。
- T6.3 实现基础筛选条。
- T6.4 实现搜索框。
- T6.5 实现排序控件。
- T6.6 实现清空筛选。

验收重点：

- 赛程和结果两个标签可用。
- 日期快捷项和自定义 from/to 请求参数正确。
- 超过 31 天范围有前端提示或阻止。
- 游戏、状态、赛事、赛区、队伍、阶段筛选变更后 URL 和请求同步。
- facets 为空时控件不报错。
- 搜索清空后保留其他筛选条件。
- 清空筛选保留当前 view，并恢复该 view 默认日期、状态和排序。

### M7 比赛列表与详情

目标：扩展卡片摘要和详情展开，准确展示状态与赛果。

任务：

- T7.1 扩展比赛卡片摘要。
- T7.2 实现详情展开组件。
- T7.3 管理列表展开状态。
- T7.4 更新格式化工具。

验收重点：

- 未开始展示开赛时间、对阵、赛事、BO。
- 进行中展示进行中标识、比分和更新时间。
- 已结束展示最终比分和胜者。
- 延期和取消明确显示状态。
- 详情可展开和收起。
- 缺失字段显示“暂无数据”或隐藏，不显示 `null`、`undefined`。
- 移动端展开内容不溢出。

### M8 状态体验与响应式

目标：完成 loading、error、empty、stale 和移动端体验。

任务：

- T8.1 细分空状态文案。
- T8.2 完善错误和 stale 状态。
- T8.3 调整桌面布局。
- T8.4 调整移动端布局。

验收重点：

- 当前时间范围无比赛、筛选无结果、搜索无结果、范围过大文案不同。
- stale 时继续展示列表，并在列表上方提示。
- 错误状态展示后端错误文案和重试按钮。
- 重试使用当前筛选条件。
- 桌面端控件不重叠。
- 手机宽度下无明显重叠、溢出和不可点击控件。

### M9 联调与发布验收

目标：完成真实数据联调、构建、测试和人工验收记录。

任务：

- T9.1 真实数据接口联调。
- T9.2 运行自动化测试。
- T9.3 运行生产构建。
- T9.4 完成人工验收清单。

验收重点：

- 有 token 时新旧接口都可请求真实数据。
- 没有 token 时错误路径清晰，并且不阻塞 mock 测试和构建。
- `npm test` 通过。
- `npm run build` 通过。
- 0.2.0 P0 验收清单全部通过，或明确列出剩余阻塞。

## 11. 开发约束

- 不提交真实 `.env.local` 或 PandaScore token。
- `.env.example` 只能包含示例变量。
- 前端不能读取或暴露 PandaScore token。
- 不使用非官方页面爬虫作为主要数据源。
- 不引入超出 0.2.0 范围的大型架构。
- 不做无关重构。
- 修改前先阅读相关现有文件。
- 如果工作区已有未提交改动，必须保护它们，不要回滚或覆盖。
- 每个任务完成后运行可行的验证命令。
- 如果验证命令无法运行，必须说明原因。

## 12. 错误处理要求

参数错误码至少包括：

- `INVALID_DATE`
- `INVALID_DATE_RANGE`
- `DATE_RANGE_TOO_LARGE`
- `INVALID_GAME`
- `INVALID_STATUS`
- `INVALID_SORT`
- `INVALID_QUERY`
- `INVALID_FILTER`

外部服务错误码保留并兼容：

- `TOKEN_MISSING`
- `PANDASCORE_REQUEST_FAILED`
- `PANDASCORE_TIMEOUT`
- `INTERNAL_ERROR`

错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户可理解的错误提示"
  }
}
```

外部请求失败时：

- 有旧缓存：返回 200，`stale: true`。
- 无旧缓存：返回错误响应。

## 13. PandaScore 映射要求

字段映射以详细设计和现有 mapper 为准，至少覆盖：

- `source: "pandascore"`。
- `updatedAt`：优先取 PandaScore 原始更新时间，缺失时使用映射或响应生成时间。
- `serie`：系列赛名称。
- `stage`：优先从 tournament 或 serie 可用字段映射，缺失为 `null`。
- `league`、`tournament`、`region`、`tournamentCountry`、`tournamentRegion`。
- `beginAt`、`endAt`、`originalScheduledAt`。
- `displayDate`、`displayTime`、`displayEndTime`、`displayOriginalTime`。
- `status`：包含未开始、进行中、已结束、延期、取消。
- `bestOf`、`matchType`。
- `winnerTeamId`、`winnerName`。
- `score`、`games`。
- `teams`：缺失时安全兜底为可展示队伍。
- `streamUrl`、`replayUrl`：字段稳定存在时映射，否则为 `null`。

状态映射：

- `not_started` -> `not_started` / 未开始。
- `running` -> `running` / 进行中。
- `finished` -> `finished` / 已结束。
- `postponed` -> `postponed` / 已延期。
- `canceled` 或 `cancelled` -> `cancelled` / 已取消。
- 未知状态必须落到稳定可展示状态，并尽量保留日志或测试样例，避免前端崩溃。

## 14. 前端体验要求

页面结构建议：

```text
Header
  站点名称 / 当前数据范围 / 刷新

Toolbar
  ViewTabs: 赛程 / 结果
  DateRangeControl: 快捷日期 + 自定义 from/to
  FilterBar: 游戏 / 状态 / 赛事 / 赛区 / 队伍 / 阶段
  SearchBox: 全局关键词 + 清空
  SortSelect
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

界面风格：

- 清晰、紧凑、易扫读。
- 第一屏直接展示赛程、筛选工具或状态。
- 不做营销式 hero。
- 不做大面积装饰。
- 不使用会挤压核心信息的复杂视觉设计。
- 移动端筛选控件可以自然换行或纵向排列。

详情展示：

- 不渲染 `null`、`undefined`。
- 缺失但用户会期待的字段显示“暂无数据”或隐藏。
- 直播和回放链接存在时展示，不存在时隐藏。
- 延期和取消状态在摘要和详情中都必须明确展示。

## 15. 主 Agent 输出格式

每完成一个模块，主 Agent 输出：

```text
模块：M{编号} {名称}
状态：完成 / 部分完成 / 阻塞

完成任务：
- T{编号} ...

验证：
- 命令：...
- 结果：...

风险或假设：
- 无 / ...

下一步：
- ...
```

最终输出：

```text
0.2.0 状态：完成 / 部分完成 / 阻塞

已完成：
- ...

验证结果：
- npm test：通过 / 失败 / 未运行，原因...
- npm run build：通过 / 失败 / 未运行，原因...
- 桌面验收：通过 / 未通过 / 未运行，原因...
- 移动端验收：通过 / 未通过 / 未运行，原因...

未完成或风险：
- ...

本地运行方式：
- ...
```

## 16. 无人值守决策规则

整个执行过程不会有人工参与，因此：

- 可以根据文档、现有代码和工程常规做保守实现决策。
- 对非阻塞歧义，选择最小、清晰、可测试的方案。
- 对 PandaScore 字段不稳定的问题，优先安全映射为 `null`、空数组或隐藏 UI。
- 对依赖外部服务的问题，优先 mock、测试隔离和明确错误提示。
- 如果没有真实 token，仍需完成 mock 测试、错误路径、本地运行、`npm test` 和 `npm run build`。
- 不要因为缺 token 停止整个工程实现。
- 不要等待人工确认 UI 文案、颜色、目录命名等低风险选择。
- 所有假设必须记录在模块输出或最终报告中。

开始执行时，先读取三份输入文档和当前源码，建立任务进度表，然后从第一个未完成任务开始推进。若某些 0.2.0 任务的部分或全部验收项已经满足，直接记录为已完成并继续下一个未完成任务。
