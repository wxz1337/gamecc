# 电竞赛程聚合网站 0.2.0 最小可执行任务拆分

## 1. 拆分原则

本文档基于 `requirements.md` 和 `detailed-design.md`，将 0.2.0 拆成适合逐步实现、逐步验收的最小任务。当前项目已经具备 0.1.0 的单日赛程、PandaScore 接入、内存缓存、基础前端列表和测试框架，因此 0.2.0 不再重复项目初始化任务，重点围绕“范围查询、多维筛选、赛程/结果视图、详情展开和兼容性”展开。

每个任务应满足：

- 范围足够小：一次只改一个明确能力点。
- 输入清晰：只需要读取相关文档章节和少量目标文件。
- 可独立验收：每个任务都有明确检查项。
- 依赖明确：后续任务可以基于前序产物继续实现。

建议一次执行 1 个任务；若上下文和改动都很小，可以合并同一模块内相邻的 2 个任务，不建议跨后端、前端、测试模块混合执行。

## 2. 模块总览

| 模块 | 目标 | 任务数 | 主要依赖 |
| --- | --- | ---: | --- |
| M1 共享协议与校验 | 扩展 0.2.0 类型、错误码、日期范围和查询参数解析 | 5 | 现有 `shared/*` |
| M2 数据源映射与范围拉取 | 支持 PandaScore 日期范围请求，补齐详情字段映射 | 4 | M1 |
| M3 后端查询服务 | 支持范围查询、筛选、排序、facets、缓存和旧接口兼容 | 6 | M1、M2 |
| M4 后端测试 | 覆盖参数、筛选、排序、facets、缓存和兼容行为 | 5 | M3 |
| M5 前端数据与 URL 状态 | 建立集中筛选状态、URL 同步和新接口请求封装 | 5 | M1、M3 |
| M6 前端筛选 UI | 实现赛程/结果视图、日期范围、筛选、搜索、排序和清空 | 6 | M5 |
| M7 比赛列表与详情 | 扩展卡片摘要和详情展开，准确展示状态与赛果 | 4 | M5 |
| M8 状态体验与响应式 | 完成 loading、error、empty、stale 和移动端体验 | 4 | M6、M7 |
| M9 联调与发布验收 | 完成真实数据联调、构建、测试和人工验收记录 | 4 | M4、M8 |

## 3. 推荐上下文包

执行任意任务时，建议提供：

- 当前任务说明。
- `requirements.md` 中对应功能章节。
- `detailed-design.md` 中对应设计章节。
- 任务涉及的现有源码文件。
- 必要时提供相邻任务的完成摘要。

避免每次载入完整需求、完整设计和全部源码。小上下文会让实现更稳。

## 4. 任务拆分详情

## M1 共享协议与校验

### T1.1 扩展共享类型

目标：让前后端共享模型覆盖 0.2.0 查询、响应、筛选项和详情字段。

推荐上下文：

- `requirements.md` 第 4、5 节。
- `detailed-design.md` 第 4、5 节。
- `shared/match.ts`。

执行内容：

- 将 `MatchStatus` 拆分或扩展为可区分筛选值 `all` 与比赛实体状态。
- 新增 `MatchSort`、`MatchView`、`MatchFilters`、`FacetOption`、`MatchFacets`。
- 扩展 `MatchesResponse`，加入 `from`、`to`、`filters`、`sort`、`total`、`facets`，并保留旧字段 `date`。
- 补充 `Match` 的 `serie`、`stage`、`replayUrl`、`source`、`updatedAt` 等 0.2.0 详情字段。

产出：

- 更新后的 `shared/match.ts`。

验收：

- 前后端可导入新类型。
- 旧响应所需字段仍可表达。
- `Match.status` 不允许出现 `all`。

### T1.2 扩展错误码

目标：为范围查询和多维筛选提供稳定错误码。

推荐上下文：

- `requirements.md` 第 5.3 节。
- `detailed-design.md` 第 5.2 节。
- `shared/errors.ts`。

执行内容：

- 新增 `INVALID_DATE_RANGE`、`DATE_RANGE_TOO_LARGE`、`INVALID_STATUS`、`INVALID_SORT`、`INVALID_QUERY`、`INVALID_FILTER`。
- 保持现有 `INVALID_DATE`、`INVALID_GAME` 等错误码兼容。

产出：

- 更新后的错误码定义。

验收：

- TypeScript 编译通过。
- 现有错误处理不需要改调用方即可继续工作。

### T1.3 实现北京时间范围工具

目标：支持最多 31 天的北京时间日期范围换算。

推荐上下文：

- `requirements.md` 第 4.2 节。
- `detailed-design.md` 第 8 节。
- `shared/date.ts`、`shared/date.test.ts`。

执行内容：

- 新增 `getBeijingDateRangeUtc(from, to)`。
- 新增 `addBeijingDays(date, days)` 或等价工具。
- 新增 `getDateSpanDays(from, to)`。
- 保留现有单日工具，必要时让单日工具复用范围工具。

产出：

- 更新后的 `shared/date.ts`。
- 对应单元测试。

验收：

- `2026-05-01` 到 `2026-05-24` 转换为 UTC `2026-04-30T16:00:00.000Z` 到 `2026-05-24T15:59:59.999Z`。
- 31 天边界测试通过。

### T1.4 实现查询参数解析

目标：统一解析旧参数和 0.2.0 新参数。

推荐上下文：

- `requirements.md` 第 5.1、5.3 节。
- `detailed-design.md` 第 5.1、5.2 节。
- `shared/validators.ts`。

执行内容：

- 新增 `parseMatchQueryParams(query)`。
- 新增 `parseDateRange(date, from, to)`，兼容 `date=YYYY-MM-DD`。
- 新增 `parseMatchStatus(value)`、`parseMatchSort(value)`、`parseMatchView(value)`。
- 新增文本筛选参数解析，统一 trim、空值归一和 80 字符限制。

产出：

- 更新后的 `shared/validators.ts`。

验收：

- 旧请求 `date=2026-05-24&game=all` 解析为同日 `from/to`。
- 非法范围返回 `INVALID_DATE_RANGE`。
- 超过 31 天返回 `DATE_RANGE_TOO_LARGE`。
- 非法状态和排序分别返回 `INVALID_STATUS`、`INVALID_SORT`。

### T1.5 补齐共享校验测试

目标：先用测试固定协议行为，降低后续后端和前端改动风险。

推荐上下文：

- T1.1 到 T1.4 的产物。
- `shared/validators.test.ts`、`shared/date.test.ts`。

执行内容：

- 覆盖旧参数兼容。
- 覆盖 from/to 范围合法性。
- 覆盖状态、排序、视图、文本筛选解析。
- 覆盖默认值策略。

产出：

- 更新后的共享层测试。

验收：

- `npm test -- shared` 或项目等价测试命令通过。

## M2 数据源映射与范围拉取

### T2.1 扩展 PandaScore 范围请求

目标：让客户端从单日请求升级为日期范围请求。

推荐上下文：

- `detailed-design.md` 第 6.3 节。
- `server/services/pandascoreClient.ts`。

执行内容：

- 将 `fetchPandaScoreMatches(game, date)` 调整为接收 `{ startUtc, endUtc }`。
- 使用 PandaScore 时间范围参数请求。
- 保留 endpoint 映射、token 校验、超时和 HTTP 错误处理。
- 预留分页循环，至少保证 page size 使用合理上限。

产出：

- 更新后的 PandaScore client。

验收：

- 调用方可传入 UTC 范围。
- token 缺失和请求失败错误行为保持稳定。

### T2.2 扩展 PandaScore 原始类型

目标：让映射层能安全读取 0.2.0 详情字段。

推荐上下文：

- `requirements.md` 第 4.4 节。
- `detailed-design.md` 第 6.4、7.6 节。
- `server/types/pandascore.ts`。

执行内容：

- 补充 serie、tournament、games、results、winner、streams、updated_at 等最小字段。
- 对不同游戏可能缺失的字段使用可选或 nullable 类型。

产出：

- 更新后的 PandaScore 原始类型。

验收：

- 映射层访问新增字段时不需要 `any`。

### T2.3 补齐比赛详情映射

目标：统一输出列表和详情所需字段。

推荐上下文：

- `requirements.md` 第 4.4、4.7 节。
- `detailed-design.md` 第 6.4、7.6 节。
- `server/mappers/pandascoreMapper.ts`。

执行内容：

- 映射 `source`、`updatedAt`、`serie`、`stage`、`replayUrl`。
- 确认比分、胜者、小局、延期、取消、原计划时间字段稳定输出。
- 缺失字段统一输出 `null` 或空数组，避免前端出现 `undefined`。

产出：

- 更新后的 mapper。

验收：

- 已结束比赛可展示比分和胜者。
- 延期或取消比赛状态不会映射为普通未开始。
- mapper 测试覆盖新增字段。

### T2.4 更新 mapper 测试样例

目标：用测试固定详情字段和状态映射。

推荐上下文：

- T2.2、T2.3 产物。
- `server/mappers/pandascoreMapper.test.ts`。

执行内容：

- 增加已结束、有比分、有胜者样例。
- 增加 postponed、cancelled、unknown 状态样例。
- 增加缺失可选字段样例。

产出：

- 更新后的 mapper 测试。

验收：

- mapper 测试通过。

## M3 后端查询服务

### T3.1 改造路由使用完整查询对象

目标：让 `/api/matches` 接收 0.2.0 参数，同时保留旧参数。

推荐上下文：

- `requirements.md` 第 5 节。
- `detailed-design.md` 第 5、6.1 节。
- `server/routes/matches.ts`。

执行内容：

- 使用 `parseMatchQueryParams(req.query)`。
- 将规范化后的查询对象传给 `getMatches`。
- 保持 `/api/matches` 路径不变。

产出：

- 更新后的 matches route。

验收：

- 旧请求和新请求都能进入 service。
- 参数错误仍由统一错误中间件返回。

### T3.2 改造 matchService 支持范围查询

目标：将单日查询升级为 from/to 范围查询。

推荐上下文：

- `detailed-design.md` 第 6.2、8、10.1 节。
- `server/services/matchService.ts`。

执行内容：

- 调用 `getBeijingDateRangeUtc(from, to)`。
- 按 `game=all` 或单游戏请求 PandaScore。
- 合并并映射结果。
- 响应中返回 `from`、`to`、`date` 兼容字段、`filters`、`total`。

产出：

- 支持范围查询的 matchService。

验收：

- 单日请求结果结构兼容旧字段。
- 范围请求返回范围内比赛。
- `total` 等于最终返回的 matches 数量。

### T3.3 实现服务端筛选

目标：支持状态、关键词、赛事、队伍、赛区、阶段组合筛选。

推荐上下文：

- `requirements.md` 第 4.1、4.5 节。
- `detailed-design.md` 第 6.2 节。
- `server/services/matchService.ts`。

执行内容：

- 实现状态筛选。
- 实现全局 `query`，命中游戏展示名、league、tournament、serie、name、队伍名、队伍缩写。
- 实现 `league`、`team`、`region`、`stage` 定向筛选。
- 多个筛选条件使用“并且”关系。

产出：

- 筛选函数，可内联或拆为私有 helper。

验收：

- 关键词大小写不敏感。
- `team` 不误匹配非队伍字段。
- 多条件组合结果符合预期。

### T3.4 实现排序策略

目标：支持 0.2.0 排序参数。

推荐上下文：

- `requirements.md` 第 4.6 节。
- `detailed-design.md` 第 6.5 节。

执行内容：

- 实现 `beginAt_asc`、`beginAt_desc`、`status`、`updatedAt_desc`、`league`。
- 根据 view 默认排序，但用户显式传入 `sort` 时优先生效。

产出：

- 排序函数，可内联或拆出独立文件。

验收：

- 赛程默认时间升序。
- 结果默认时间降序。
- 状态优先顺序为进行中、未开始、已结束、延期、取消。

### T3.5 生成 facets

目标：为前端下拉和筛选项提供当前范围内可选项。

推荐上下文：

- `requirements.md` 第 5.2 节。
- `detailed-design.md` 第 6.6 节。

执行内容：

- 基于当前日期范围和游戏请求范围内的归一化比赛生成 facets。
- 输出 games、statuses、leagues、teams、regions、stages。
- 每个选项包含 value、label、count。

产出：

- `buildMatchFacets` 或等价函数。

验收：

- facets 不包含空字符串。
- count 与基础集合一致。
- 缺失字段不会生成 `null` 或 `undefined` 选项。

### T3.6 扩展缓存 key 和 stale 兜底

目标：让缓存适配范围查询和筛选参数。

推荐上下文：

- `detailed-design.md` 第 6.7 节。
- `server/services/cacheService.ts`、`server/services/matchService.ts`。

执行内容：

- 将 key 扩展为包含 from、to、game、view、status、query、league、team、region、stage、sort。
- 文本参数 trim 并小写后进入 key。
- `refresh=1` 跳过 fresh cache。
- 失败时仍可返回 stale 响应。

产出：

- 更新后的缓存 key 和 service 缓存逻辑。

验收：

- 不同筛选条件不会互相命中缓存。
- 外部请求失败且有旧缓存时返回 `stale: true`。

## M4 后端测试

### T4.1 补充路由兼容测试

目标：确保旧接口不被 0.2.0 破坏。

推荐上下文：

- `requirements.md` 第 5.1、8 节。
- `server/app.test.ts`。

执行内容：

- 测试 `/api/matches?date=YYYY-MM-DD&game=all` 返回 200。
- 断言响应保留 `date`、`timezone`、`stale`、`updatedAt`、`matches`。
- 测试新接口返回 `from`、`to`、`filters`、`sort`、`total`、`facets`。

产出：

- 更新后的 app 集成测试。

验收：

- app 测试通过。

### T4.2 补充参数错误测试

目标：固定错误码和 HTTP 行为。

推荐上下文：

- `detailed-design.md` 第 9.2 节。
- `server/app.test.ts`、`shared/validators.test.ts`。

执行内容：

- 覆盖非法日期、非法范围、范围超过 31 天。
- 覆盖非法状态、非法排序、非法文本长度。

产出：

- 参数错误测试。

验收：

- 每个错误返回对应 code。

### T4.3 补充筛选和排序测试

目标：确保查询核心逻辑可回归。

推荐上下文：

- T3.3、T3.4 产物。
- `server/services/matchService.test.ts` 或新测试文件。

执行内容：

- 使用 mock match 集合测试 query、league、team、region、stage。
- 测试多条件“并且”关系。
- 测试各排序策略。

产出：

- service 层测试。

验收：

- 筛选和排序测试通过。

### T4.4 补充 facets 测试

目标：确保 facets 可用于前端筛选控件。

推荐上下文：

- T3.5 产物。

执行内容：

- 测试 games、statuses、leagues、teams、regions、stages 输出。
- 测试缺失字段不会生成无效选项。
- 测试 count 正确。

产出：

- facets 测试。

验收：

- facets 测试通过。

### T4.5 补充缓存和 stale 测试

目标：保证范围缓存和降级逻辑稳定。

推荐上下文：

- `server/services/cacheService.test.ts`。
- T3.6 产物。

执行内容：

- 测试新 key 生成。
- 测试 refresh 跳过 fresh cache。
- 测试有过期缓存时 stale 返回。

产出：

- 更新后的缓存测试。

验收：

- 缓存相关测试通过。

## M5 前端数据与 URL 状态

### T5.1 扩展前端 API 请求封装

目标：前端可以请求 0.2.0 参数并处理错误。

推荐上下文：

- `detailed-design.md` 第 7.4、7.5 节。
- `src/api/matches.ts`。

执行内容：

- 将请求参数从 `date/game` 扩展为完整筛选对象。
- 只发送非空参数。
- 保留 `refresh` 能力。
- 解析后端错误响应为前端可显示错误。

产出：

- 更新后的 `fetchMatches`。

验收：

- 能生成 `from/to/game/status/query/league/team/region/stage/sort/view` 查询字符串。

### T5.2 实现 URL 状态工具

目标：筛选条件可在 URL 中恢复和分享。

推荐上下文：

- `requirements.md` 第 4.1、8 节。
- `detailed-design.md` 第 7.3 节。
- `src/utils/date.ts`。

执行内容：

- 新增 `src/utils/urlState.ts`。
- 实现从 `URLSearchParams` 读取筛选状态。
- 实现将筛选状态序列化到 URL。
- 默认值可省略，空文本参数不写入。

产出：

- URL 状态工具。

验收：

- `?view=results&from=2026-05-01&to=2026-05-24&game=lol&status=finished` 可恢复状态。
- 默认状态不会生成冗长 URL。

### T5.3 实现筛选状态 hook

目标：集中管理视图、日期、筛选、搜索和排序状态。

推荐上下文：

- `detailed-design.md` 第 7.2、7.3 节。
- T5.2 产物。

执行内容：

- 新增 `src/hooks/useMatchFilters.ts`。
- 首次加载从 URL 读取状态。
- 没有 URL 时使用赛程默认值。
- 切换赛程/结果视图时应用对应默认值。
- 用户手动选择日期或状态后，视图切换不强行覆盖用户选择。
- 提供 `resetFilters`，保留当前 view。

产出：

- `useMatchFilters`。

验收：

- 首次进入默认赛程视图。
- 结果视图默认最近 7 天、已结束、时间降序。
- reset 后恢复当前视图默认状态。

### T5.4 改造 `useMatches`

目标：让数据 hook 接收完整筛选对象。

推荐上下文：

- `src/hooks/useMatches.ts`。
- T5.1、T5.3 产物。

执行内容：

- 参数从 `{ date, game }` 改为完整筛选状态。
- 参数变化时重新请求。
- 保留 `AbortController` 或请求序号防止旧响应覆盖。
- `refresh` 使用当前筛选状态。

产出：

- 更新后的 `useMatches`。

验收：

- 快速切换筛选不会展示旧结果。
- 手动刷新使用当前 URL 和筛选条件。

### T5.5 接入 App 顶层状态

目标：让页面主流程使用新的筛选状态和数据请求。

推荐上下文：

- `src/App.tsx`。
- T5.3、T5.4 产物。

执行内容：

- 移除 App 内分散的 `date`、`game` state。
- 接入 `useMatchFilters` 和新版 `useMatches`。
- 将状态和操作传给后续 UI 组件。

产出：

- App 顶层数据流改造。

验收：

- 页面仍能加载比赛列表。
- URL 刷新后恢复当前筛选。

## M6 前端筛选 UI

### T6.1 实现赛程/结果视图切换

目标：提供两个主要视图入口。

推荐上下文：

- `requirements.md` 第 4.3 节。
- `detailed-design.md` 第 7.1、7.2 节。

执行内容：

- 新增 `ViewTabs` 组件。
- 支持赛程和结果两个标签。
- 切换时调用筛选状态 hook 的 view 更新逻辑。

产出：

- `src/components/ViewTabs.tsx`。

验收：

- 赛程默认未来范围和升序。
- 结果默认历史范围和降序。

### T6.2 实现日期范围控件

目标：支持快捷日期和自定义范围。

推荐上下文：

- `requirements.md` 第 4.2 节。
- `detailed-design.md` 第 7.1、8 节。

执行内容：

- 新增 `DateRangeControl`。
- 支持今天、明天、本周、下周、最近 7 天、未来 7 天、过去比赛、未来赛程。
- 支持自定义 from/to 输入。
- 前端提示或阻止超过 31 天范围。

产出：

- `src/components/DateRangeControl.tsx`。

验收：

- 选择快捷项后请求参数正确。
- 自定义日期优先于快捷项显示。

### T6.3 实现基础筛选条

目标：支持游戏、状态、赛事、赛区、队伍、阶段筛选。

推荐上下文：

- `requirements.md` 第 4.1 节。
- `detailed-design.md` 第 7.1、7.4 节。

执行内容：

- 新增或改造 `FilterBar`。
- 游戏和状态使用固定选项。
- 赛事、赛区、队伍、阶段优先使用 response facets。
- facets 为空时控件保持可用或降级为文本输入。

产出：

- `src/components/FilterBar.tsx`。

验收：

- 筛选项变更后 URL 和请求同步。
- 空 facets 不导致控件报错。

### T6.4 实现搜索框

目标：提供轻量全局关键词搜索。

推荐上下文：

- `requirements.md` 第 4.5 节。
- `detailed-design.md` 第 7.4 节。

执行内容：

- 新增 `SearchBox`。
- 支持输入、提交或短延迟触发搜索。
- 支持清空按钮。
- 清空后保留其他筛选条件。

产出：

- `src/components/SearchBox.tsx`。

验收：

- 搜索参数写入 URL。
- 清空搜索立即恢复当前筛选下列表。

### T6.5 实现排序控件

目标：提供时间升序、时间降序和建议排序项。

推荐上下文：

- `requirements.md` 第 4.6 节。
- `detailed-design.md` 第 6.5、7.4 节。

执行内容：

- 新增 `SortSelect`。
- 支持 `beginAt_asc`、`beginAt_desc`、`status`、`updatedAt_desc`、`league`。

产出：

- `src/components/SortSelect.tsx`。

验收：

- 排序变更后请求参数正确。

### T6.6 实现清空筛选

目标：一键回到当前视图默认状态。

推荐上下文：

- `requirements.md` 第 4.1、4.3 节。
- `detailed-design.md` 第 7.3 节。

执行内容：

- 新增或改造清空筛选按钮。
- 保留当前 view。
- 清空 query、league、team、region、stage。
- 恢复当前 view 默认日期、状态和排序。

产出：

- 清空筛选交互。

验收：

- URL、控件显示和请求状态一致。

## M7 比赛列表与详情

### T7.1 扩展比赛卡片摘要

目标：列表中准确展示 0.2.0 状态和结果信息。

推荐上下文：

- `requirements.md` 第 4.4、4.7 节。
- `src/components/MatchCard.tsx`、`src/components/StatusBadge.tsx`。

执行内容：

- 未开始展示开赛时间、对阵、赛事、BO。
- 进行中展示进行中标识、比分和更新时间。
- 已结束展示最终比分和胜者。
- 延期和取消明确显示状态。

产出：

- 更新后的 MatchCard 摘要区域。

验收：

- 不显示 `null`、`undefined`。
- 延期和取消不会看起来像普通未开始。

### T7.2 实现详情展开组件

目标：MVP 使用列表内展开，不新增详情路由。

推荐上下文：

- `requirements.md` 第 4.4 节。
- `detailed-design.md` 第 7.6 节。

执行内容：

- 新增 `MatchDetailPanel`。
- 展示游戏、赛事、系列赛、阶段、状态、BO、开始/结束时间。
- 展示比分、胜者、小局、弃权/平局标记。
- 展示赛区、国家、奖金池、等级、数据来源、更新时间。
- 直播和回放链接存在时展示，不存在时隐藏。

产出：

- `src/components/MatchDetailPanel.tsx`。

验收：

- 详情可展开和收起。
- 缺失但关键的字段显示“暂无数据”或隐藏，不显示原始空值。

### T7.3 管理列表展开状态

目标：让多个卡片详情交互稳定。

推荐上下文：

- `src/components/MatchList.tsx`。
- T7.2 产物。

执行内容：

- 在 `MatchList` 或 `MatchCard` 中管理展开状态。
- 支持单个或多个展开，选择一种并保持一致。
- 列表数据刷新后避免展开到不存在的比赛。

产出：

- 更新后的 MatchList/MatchCard。

验收：

- 展开状态不会因刷新导致报错。
- 移动端展开内容不溢出。

### T7.4 更新格式化工具

目标：集中处理文案、比分、时间和缺省值。

推荐上下文：

- `src/utils/matchFormatters.ts`。

执行内容：

- 新增状态文案和排序文案。
- 新增比分、胜者、BO、数据来源、更新时间格式化。
- 新增空字段展示 helper。

产出：

- 更新后的格式化工具。

验收：

- UI 组件不重复拼接复杂文案。

## M8 状态体验与响应式

### T8.1 细分空状态文案

目标：空结果能告诉用户发生了什么。

推荐上下文：

- `requirements.md` 第 6.4 节。
- `detailed-design.md` 第 7.5 节。
- `src/components/StatePanels.tsx`。

执行内容：

- 无关键词且无额外筛选：当前时间范围没有已收录比赛。
- 有筛选条件：当前筛选条件下没有比赛。
- 有搜索关键词：没有找到匹配关键词的比赛。
- 范围过大错误：展示后端错误并提示最大 31 天。

产出：

- 更新后的空状态逻辑。

验收：

- 不同场景文案不同。

### T8.2 完善错误和 stale 状态

目标：失败和缓存降级时用户能理解当前数据状态。

推荐上下文：

- `requirements.md` 第 4.7、8 节。
- `detailed-design.md` 第 7.5 节。

执行内容：

- stale 时继续展示列表，并在列表上方提示。
- 错误状态展示后端错误文案和重试按钮。
- 更新时间使用响应 `updatedAt`。

产出：

- 更新后的状态提示。

验收：

- stale 数据不会被 error 覆盖。
- 重试使用当前筛选条件。

### T8.3 调整桌面布局

目标：让多筛选控件在桌面端可扫读、不过度拥挤。

推荐上下文：

- `requirements.md` 第 6.1 节。
- `src/styles.css`。

执行内容：

- 将视图、日期、筛选、搜索、排序分组。
- 控件宽度和换行稳定。
- 避免文本挤出按钮或选择器。

产出：

- 桌面样式更新。

验收：

- 主要桌面宽度下控件不重叠。

### T8.4 调整移动端布局

目标：移动端可完成筛选、搜索、查看详情。

推荐上下文：

- `src/styles.css`。

执行内容：

- 筛选控件纵向排列或自然换行。
- 详情面板不横向溢出。
- 按钮和输入控件有足够点击区域。

产出：

- 移动端样式更新。

验收：

- 手机宽度下无明显重叠、溢出和不可点击控件。

## M9 联调与发布验收

### T9.1 真实数据接口联调

目标：确认 PandaScore token 环境下新接口可用。

推荐上下文：

- `.env.example`。
- `server/services/pandascoreClient.ts`。

执行内容：

- 使用本地 token 请求单日、范围、游戏筛选、历史结果。
- 观察分页、限流、空数据和错误表现。
- 不提交真实 token。

产出：

- 联调记录或更新 `docs/project-status.md`。

验收：

- 真实数据下 `/api/matches` 新旧调用都可用。

### T9.2 运行自动化测试

目标：确认 0.2.0 改动没有破坏现有能力。

推荐上下文：

- `package.json`。

执行内容：

- 运行 `npm test`。
- 修复失败测试。

产出：

- 通过的测试结果。

验收：

- `npm test` 通过。

### T9.3 运行生产构建

目标：确认前后端 TypeScript 和 Vite 构建通过。

推荐上下文：

- `package.json`、`vite.config.ts`、`tsconfig*.json`。

执行内容：

- 运行 `npm run build`。
- 修复类型和构建错误。

产出：

- 成功构建。

验收：

- `npm run build` 通过。

### T9.4 完成人工验收清单

目标：按需求文档确认版本可交付。

推荐上下文：

- `requirements.md` 第 8 节。
- `detailed-design.md` 第 12 节。

执行内容：

- 验证任意合法单日查询。
- 验证最多 31 天范围查询。
- 验证历史赛果、未来赛程、赛程/结果视图默认值。
- 验证游戏、状态、赛事、队伍、关键词组合筛选。
- 验证详情展开、比分、胜者、状态、数据来源和更新时间。
- 验证刷新后 URL 状态恢复。
- 验证桌面和移动端布局。

产出：

- 更新验收记录。

验收：

- 0.2.0 P0 能力全部通过。

## 5. 建议执行顺序

1. M1：先固定共享协议、日期和校验。
2. M2：再扩展数据源请求和字段映射。
3. M3：完成后端范围查询、筛选、排序、facets 和缓存。
4. M4：用测试锁住后端行为。
5. M5：接入前端数据流和 URL 状态。
6. M6：实现筛选工具栏。
7. M7：完善列表摘要和详情展开。
8. M8：打磨状态文案和响应式。
9. M9：联调、测试、构建和人工验收。

## 6. 可延期项

以下能力不建议塞入 0.2.0 P0 交付：

- 收藏队伍、赛事或游戏。
- 热门赛事和我的关注标签。
- 开赛提醒和日历订阅。
- 多数据源融合。
- 人工赛事重要程度权重。
- 独立比赛详情路由。
- 直播或回放链接管理后台。
