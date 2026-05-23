# 电竞赛程聚合网站可执行任务拆分

## 1. 拆分原则

本文档基于 `requirements.md` 和 `detailed-design.md`，将 MVP 拆成适合模型逐步执行的任务。每个任务都应满足：

- 输入上下文足够小：只需要读取少量相关文档章节和目标文件。
- 输出边界明确：一次只完成一个可验证的功能片段。
- 可独立验收：每个任务都有明确检查项。
- 依赖关系清楚：后续任务可以基于前序产物继续实现。

建议一次只交给模型 1 个任务。若模型上下文较大，也最多合并同一模块内相邻的 2 个任务，不建议跨后端、前端、测试大模块混合执行。

## 2. 模块总览

| 模块 | 目标 | 建议任务数 | 依赖 |
| --- | --- | ---: | --- |
| M0 项目骨架 | 建立可运行的 React + Vite + Express + TypeScript 项目 | 3 | 无 |
| M1 共享类型与基础工具 | 定义 Match 类型、日期工具、错误模型 | 3 | M0 |
| M2 后端核心 API | 实现 `/api/matches` 路由、参数校验、响应结构 | 3 | M1 |
| M3 PandaScore 接入 | 实现数据源客户端与字段映射 | 4 | M2 |
| M4 缓存与降级 | 实现内存缓存、TTL、stale 兜底、刷新策略 | 3 | M3 |
| M5 前端数据层 | 实现请求封装和 `useMatches` | 3 | M2 |
| M6 前端 UI | 实现页面布局、筛选、日期切换、比赛列表、状态组件 | 5 | M5 |
| M7 状态与体验完善 | 完成 loading、error、empty、stale、响应式 | 4 | M6 |
| M8 测试 | 单元测试、接口测试、前端交互测试 | 5 | M4、M7 |
| M9 联调与验收 | 本地运行、真实 token 联调、验收清单 | 3 | M8 |

## 3. 推荐上下文包

执行任意任务时，建议提供给模型的上下文不超过以下范围：

- 必读：当前任务说明。
- 必读：`requirements.md` 中对应章节。
- 必读：`detailed-design.md` 中对应模块章节。
- 必读：任务涉及的现有源码文件。
- 可选：相邻任务的产出摘要。

不要每次都塞入完整需求文档、完整设计文档和全部源码。更好的方式是按任务读取相关章节，让模型在小而准确的上下文里工作。

## 4. 任务拆分详情

## M0 项目骨架

### T0.1 初始化项目结构

目标：创建前端、后端和共享类型的基础目录结构。

推荐上下文：

- `detailed-design.md` 第 3 节、第 4 节。
- `requirements.md` 第 7 节。

执行内容：

- 初始化 React + Vite + TypeScript 前端。
- 初始化 Express + TypeScript 后端。
- 建立 `src/`、`server/`、`shared/` 或等价目录。
- 配置基础 npm scripts：`dev`、`build`、`test`。

产出：

- 可安装依赖的项目骨架。
- 基础入口文件。
- 最小可启动页面和后端 health 路由。

验收：

- `npm install` 成功。
- 前端开发服务可启动。
- 后端开发服务可启动。
- health 接口返回成功。

### T0.2 配置工程规范

目标：补齐 TypeScript、环境变量、忽略文件和基础配置。

推荐上下文：

- `detailed-design.md` 第 11 节、第 13 节。

执行内容：

- 配置前后端 TypeScript。
- 增加 `.env.example`。
- 确认 `.env.local` 或真实 token 文件不进入 Git。
- 配置基础 lint 或 format 脚本，若项目选择不引入 lint，则说明原因。

产出：

- `tsconfig` 配置。
- `.env.example`。
- `.gitignore`。

验收：

- TypeScript 编译不报基础配置错误。
- 示例环境变量包含 `PANDASCORE_API_TOKEN`、`DEFAULT_TIMEZONE`、`CACHE_TTL_SECONDS`。

### T0.3 建立前后端本地代理关系

目标：让前端可以通过统一路径调用后端 API。

推荐上下文：

- `detailed-design.md` 第 3.2 节、第 5 节。

执行内容：

- 配置 Vite dev proxy 或统一本地端口策略。
- 前端预留 `/api/matches` 调用路径。
- 后端注册 `/api` 路由前缀。

产出：

- 前端请求 `/api/health` 或 `/api/matches` 可到达后端。

验收：

- 浏览器页面能展示后端 health 结果或调试信息。
- 代理配置不暴露 PandaScore token。

## M1 共享类型与基础工具

### T1.1 定义核心数据类型

目标：实现需求和设计文档中的 Match、Team、GameType、MatchStatus 类型。

推荐上下文：

- `requirements.md` 第 8 节。
- `detailed-design.md` 第 6 节。

执行内容：

- 创建共享或前后端各自的 `match.ts` 类型文件。
- 定义 `GameType`、`GameFilter`、`MatchStatus`、`Team`、`Match`、`MatchesResponse`。
- 保证 API 响应模型和前端消费模型一致。

产出：

- 类型文件。
- 必要的导出路径。

验收：

- 类型可被前端和后端引用。
- 字段覆盖设计文档第 6.1 节。

### T1.2 实现北京时间日期工具

目标：实现日期参数、北京时间显示和 UTC 查询范围工具。

推荐上下文：

- `requirements.md` 第 5.1 节、第 13.3 节。
- `detailed-design.md` 第 7 节。

执行内容：

- 实现 `isValidDateString(date)`。
- 实现 `getBeijingDayRangeUtc(date)`。
- 实现 `formatBeijingDateTime(iso)` 或后端等价工具。
- 添加少量单元测试或临时验证用例。

产出：

- `dateRange.ts` 或等价工具文件。

验收：

- `2026-05-24` 对应 UTC 范围为 `2026-05-23T16:00:00.000Z` 到 `2026-05-24T15:59:59.999Z`。
- 展示时间按北京时间输出 `HH:mm`。

### T1.3 定义错误模型与参数校验工具

目标：统一后端错误码、HTTP 状态和参数校验。

推荐上下文：

- `detailed-design.md` 第 5.1 节、第 12 节。

执行内容：

- 定义错误码常量。
- 实现 `AppError` 或等价错误类型。
- 实现 `parseGameFilter`、`parseDateParam`。

产出：

- `errors.ts`、`validators.ts` 或等价文件。

验收：

- 非法日期返回 `INVALID_DATE`。
- 非法游戏返回 `INVALID_GAME`。
- 合法游戏支持 `all`、`cs2`、`valorant`、`lol`。

## M2 后端核心 API

### T2.1 实现 `/api/matches` 路由骨架

目标：建立接口结构，先返回模拟数据。

推荐上下文：

- `requirements.md` 第 7.3 节。
- `detailed-design.md` 第 5 节。
- T1 类型和校验工具。

执行内容：

- 创建 `routes/matches.ts`。
- 接收 `date`、`game` 参数。
- 使用校验工具。
- 返回符合 `MatchesResponse` 的模拟数据。

产出：

- 可调用的 `/api/matches`。

验收：

- 合法请求返回 200。
- 响应包含 `date`、`timezone`、`game`、`stale`、`updatedAt`、`matches`。
- 非法参数返回对应错误。

### T2.2 实现 matchService 聚合接口

目标：让路由层通过业务层获取数据。

推荐上下文：

- `detailed-design.md` 第 4.2.2 节、第 8.1 节。

执行内容：

- 创建 `matchService.getMatches({ date, game, refresh })`。
- 暂时使用 mock provider。
- 实现按 `beginAt` 升序排序。
- 实现 `game=all` 和单游戏分支。

产出：

- `matchService.ts`。

验收：

- `game=all` 返回多个游戏模拟数据并按时间排序。
- `game=lol` 只返回 LoL 模拟数据。

### T2.3 完善后端错误响应中间件

目标：统一返回错误 JSON，避免泄漏内部信息。

推荐上下文：

- `detailed-design.md` 第 12 节、第 13 节。

执行内容：

- 增加 Express 错误处理中间件。
- 统一错误响应格式。
- 对未知错误返回 `INTERNAL_ERROR`。
- 不输出 token 或敏感信息。

产出：

- 错误中间件。
- 路由接入错误处理。

验收：

- 参数错误返回 400。
- 未知错误返回 500。
- 响应格式为 `{ "error": { "code": "...", "message": "..." } }`。

## M3 PandaScore 接入

### T3.1 实现 PandaScore client

目标：封装 token、endpoint、超时和基础请求。

推荐上下文：

- `requirements.md` 第 4 节、第 10 节。
- `detailed-design.md` 第 4.2.3 节、第 8 节、第 11 节。

执行内容：

- 创建 `pandascoreClient.ts`。
- 从环境变量读取 `PANDASCORE_API_TOKEN`。
- 维护游戏到 endpoint 的映射。
- 实现 `fetchMatches(game, range)`。
- 处理 HTTP 错误和超时。

产出：

- PandaScore client。

验收：

- token 缺失时抛出 `TOKEN_MISSING`。
- 请求失败时抛出 `PANDASCORE_REQUEST_FAILED` 或 `PANDASCORE_TIMEOUT`。

### T3.2 定义 PandaScore 原始类型

目标：为映射层提供最小必要的原始数据类型。

推荐上下文：

- `detailed-design.md` 第 8.3 节。

执行内容：

- 创建 `pandascore.ts`。
- 定义 match、league、serie、tournament、opponent、stream 的最小字段类型。
- 对不稳定字段使用可选类型。

产出：

- PandaScore 原始类型文件。

验收：

- 映射层可基于这些类型开发。
- 缺失字段不会导致 TypeScript 编译错误。

### T3.3 实现 PandaScore 到 Match 的字段映射

目标：把原始数据转换为内部统一模型。

推荐上下文：

- `requirements.md` 第 8 节。
- `detailed-design.md` 第 6.2 节、第 8.3 节。

执行内容：

- 创建 `pandascoreMapper.ts`。
- 映射 `id`、`game`、`league`、`tournament`、`beginAt`、`status`、`bestOf`、`teams`、`streamUrl`。
- 处理 `TBD` 队伍。
- 处理状态值 `canceled` 和 `cancelled`。

产出：

- 映射函数 `mapPandaScoreMatch(raw, game)`。

验收：

- 队伍为空时输出两个 `TBD`。
- 状态映射符合设计文档。
- `displayDate`、`displayTime` 按北京时间生成。

### T3.4 将真实数据源接入 matchService

目标：替换 mock provider，使用 PandaScore client。

推荐上下文：

- T2.2、T3.1、T3.3 相关文件。
- `detailed-design.md` 第 8.1 节。

执行内容：

- `game=all` 并发请求三类游戏。
- 单游戏只请求对应 endpoint。
- 合并结果后按 `beginAt` 排序。
- 保留 mock 数据作为测试用例，不进入生产路径。

产出：

- 接入真实数据源的 `matchService`。

验收：

- 配置 token 后接口可返回真实归一化数据。
- 未配置 token 时返回明确错误。

## M4 缓存与降级

### T4.1 实现内存缓存服务

目标：提供最小缓存读写能力。

推荐上下文：

- `requirements.md` 第 9 节。
- `detailed-design.md` 第 9 节。

执行内容：

- 创建 `cacheService.ts`。
- 实现 `getFresh`、`getAny`、`set`、`buildCacheKey`。
- 支持 TTL。

产出：

- 通用内存缓存服务。

验收：

- 未过期缓存可命中。
- 过期缓存不会被 `getFresh` 返回。
- `getAny` 可读取过期缓存。

### T4.2 在 matchService 中接入缓存

目标：减少 PandaScore 请求并支持刷新。

推荐上下文：

- T4.1 文件。
- `detailed-design.md` 第 9.3 节、第 9.4 节。

执行内容：

- 根据 `matches:{date}:{game}` 读写缓存。
- 普通请求优先返回未过期缓存。
- `refresh=1` 跳过 fresh cache。
- 请求成功后写入缓存。

产出：

- 带缓存的赛程接口。

验收：

- 连续两次相同请求第二次命中缓存。
- `refresh=1` 会重新请求数据源。

### T4.3 实现 stale 兜底

目标：PandaScore 失败时尽量返回旧数据。

推荐上下文：

- `detailed-design.md` 第 9.3 节、第 12.2 节。

执行内容：

- 外部请求失败且有过期缓存时返回旧缓存。
- 响应设置 `stale: true`。
- 无缓存时正常返回错误。

产出：

- stale 降级逻辑。

验收：

- 有旧缓存且数据源失败时接口仍返回 200。
- 响应 `stale` 为 `true`。
- 无旧缓存时返回 502 或 504。

## M5 前端数据层

### T5.1 定义前端 API 请求封装

目标：实现 `fetchMatches`。

推荐上下文：

- `detailed-design.md` 第 4.1.2 节、第 5 节。
- 共享类型文件。

执行内容：

- 创建 `src/api/matches.ts`。
- 封装请求参数。
- 处理非 2xx 错误。
- 返回 `MatchesResponse`。

产出：

- 前端 API 封装。

验收：

- 能请求 `/api/matches`。
- 错误响应能转换为前端可显示的错误。

### T5.2 实现 `useMatches`

目标：统一管理赛程请求状态。

推荐上下文：

- `detailed-design.md` 第 4.1.3 节。
- T5.1 文件。

执行内容：

- 创建 `src/hooks/useMatches.ts`。
- 管理 `data`、`loading`、`error`。
- 监听 `date` 和 `game`。
- 提供 `refresh` 方法。
- 使用 `AbortController` 或请求序号避免旧响应覆盖。

产出：

- `useMatches` hook。

验收：

- 参数变化会重新请求。
- 手动刷新可重新请求。
- 快速切换不会展示错误的旧状态。

### T5.3 实现前端日期状态工具

目标：支持今天和明天切换。

推荐上下文：

- `requirements.md` 第 5.3 节。
- `detailed-design.md` 第 10.1 节。

执行内容：

- 创建 `src/utils/date.ts`。
- 实现获取北京时间今天、明天的 `YYYY-MM-DD`。
- 实现显示当前日期的格式化工具。

产出：

- 前端日期工具。

验收：

- 今天和明天参数正确。
- 切换后传给 API 的 date 为 `YYYY-MM-DD`。

## M6 前端 UI

### T6.1 实现 App 容器和页面框架

目标：搭建单页应用主结构。

推荐上下文：

- `requirements.md` 第 6.1 节。
- `detailed-design.md` 第 4.1.1 节、第 10.1 节。

执行内容：

- 管理 `date`、`game` 状态。
- 接入 `useMatches`。
- 渲染 Header、Controls、Main、Footer 区域。

产出：

- 可运行的基础页面。

验收：

- 首页默认请求今天、全部游戏。
- 页面包含顶部、筛选区、主内容、底部说明。

### T6.2 实现游戏筛选组件

目标：支持全部、CS2、VALORANT、LoL 筛选。

推荐上下文：

- `requirements.md` 第 5.2 节。
- `detailed-design.md` 第 4.1.4 节。

执行内容：

- 创建 `GameFilter`。
- 使用分段控件样式。
- 当前筛选高亮。
- 点击后更新 `game`。

产出：

- 游戏筛选 UI。

验收：

- 四种筛选都可点击。
- 筛选后重新请求或更新列表。

### T6.3 实现日期切换和刷新组件

目标：支持今天、明天、刷新。

推荐上下文：

- `requirements.md` 第 5.3 节、第 5.6 节。
- `detailed-design.md` 第 10.1 节。

执行内容：

- 创建 `DateSwitch`。
- Header 或 DateSwitch 中加入刷新按钮。
- 今天和明天按钮状态清晰。

产出：

- 日期切换和刷新 UI。

验收：

- 默认今天。
- 可切换明天。
- 可回到今天。
- 刷新按钮触发 `refresh`。

### T6.4 实现比赛列表组件

目标：展示按时间排序的比赛。

推荐上下文：

- `requirements.md` 第 5.1 节、第 6.2 节。
- `detailed-design.md` 第 10.2 节。

执行内容：

- 创建 `MatchList` 和 `MatchItem`。
- 展示时间、游戏标签、赛事名、队伍、BO、状态。
- 队伍缺失时展示 `TBD`。

产出：

- 赛程列表 UI。

验收：

- 字段完整。
- 列表顺序使用接口返回顺序。
- 手机宽度下内容不明显溢出。

### T6.5 实现状态标签组件

目标：统一展示比赛状态中文文案。

推荐上下文：

- `requirements.md` 第 5.4 节。
- `detailed-design.md` 第 6.2 节。

执行内容：

- 创建 `StatusBadge`。
- 映射未开始、进行中、已结束、已延期、已取消。
- 根据状态设置低调但可区分的样式。

产出：

- 状态标签组件。

验收：

- 所有状态都有中文展示。
- 未知状态不会导致页面报错。

## M7 状态与体验完善

### T7.1 实现 loading、error、empty 状态

目标：补齐基础页面状态。

推荐上下文：

- `requirements.md` 第 5.5 节、第 5.6 节。
- `detailed-design.md` 第 10.3 节、第 10.4 节。

执行内容：

- 创建 `LoadingState`、`ErrorState`、`EmptyState`。
- 错误状态提供重试按钮。
- 空状态区分全部为空和筛选为空。

产出：

- 状态组件。

验收：

- 加载中有提示。
- API 错误有提示和重试。
- 无比赛有明确提示。

### T7.2 实现 stale 数据提示

目标：当接口返回旧缓存时提示数据可能不是最新。

推荐上下文：

- `detailed-design.md` 第 9.3 节、第 10.4 节。

执行内容：

- 检查响应 `stale`。
- 在列表上方展示简洁提示。
- 不阻塞用户浏览旧数据。

产出：

- stale 提示 UI。

验收：

- `stale=true` 时展示提示。
- `stale=false` 时不展示。

### T7.3 完成响应式布局

目标：确保桌面和手机都可扫读。

推荐上下文：

- `requirements.md` 第 6.3 节。
- `detailed-design.md` 第 10.5 节。

执行内容：

- 优化 CSS 布局。
- 桌面使用紧凑行布局。
- 手机使用两到三行布局。
- 防止长赛事名和队伍名撑破容器。

产出：

- 响应式样式。

验收：

- 375px 宽度下无横向滚动。
- 桌面端列表信息密度合理。
- 按钮文字不溢出。

### T7.4 视觉收尾与可用性检查

目标：让 MVP 达到个人效率工具的清晰质感。

推荐上下文：

- `requirements.md` 第 6.3 节。
- `detailed-design.md` 第 10 节。

执行内容：

- 统一间距、字号、颜色。
- 控件状态可辨识。
- 底部展示数据来源。
- 避免营销式 hero 和冗余说明。

产出：

- 可日常使用的页面视觉。

验收：

- 第一屏直接看到赛程或状态。
- 页面没有大面积无效装饰。
- 信息层级清楚。

## M8 测试

### T8.1 日期工具单元测试

目标：验证北京时间日期转换准确。

推荐上下文：

- T1.2 文件。
- `detailed-design.md` 第 7 节。

执行内容：

- 测试 `YYYY-MM-DD` 校验。
- 测试北京时间到 UTC 范围。
- 测试北京时间展示格式。

产出：

- 日期工具测试。

验收：

- 覆盖 `2026-05-24` 示例。
- 边界时间不会跨错日期。

### T8.2 映射层单元测试

目标：验证 PandaScore 原始数据到 Match 的转换。

推荐上下文：

- T3.2、T3.3 文件。
- `detailed-design.md` 第 6.2 节、第 8.3 节。

执行内容：

- 测试字段映射。
- 测试状态映射。
- 测试队伍缺失。
- 测试 BO 和 stream 缺失。

产出：

- mapper 测试。

验收：

- 缺失字段不崩溃。
- 输出符合 `Match` 类型。

### T8.3 缓存单元测试

目标：验证缓存命中、过期和 stale 逻辑。

推荐上下文：

- T4.1、T4.2、T4.3 文件。

执行内容：

- 测试 fresh cache。
- 测试 expired cache。
- 测试 refresh 跳过缓存。
- 测试数据源失败返回旧缓存。

产出：

- cache 或 matchService 测试。

验收：

- 关键缓存路径均被覆盖。

### T8.4 API 集成测试

目标：验证 `/api/matches` 行为。

推荐上下文：

- T2 到 T4 后端文件。
- `detailed-design.md` 第 5 节、第 12 节。

执行内容：

- 使用 mock PandaScore client。
- 测试合法请求。
- 测试非法参数。
- 测试单游戏筛选。
- 测试数据源失败。

产出：

- API 集成测试。

验收：

- 响应状态码和 JSON 结构符合设计。

### T8.5 前端交互测试或手工测试脚本

目标：验证主要用户流程。

推荐上下文：

- M6、M7 前端文件。
- `requirements.md` 第 14 节。

执行内容：

- 测试初始加载今天赛程。
- 测试切换明天。
- 测试游戏筛选。
- 测试 loading、error、empty。
- 测试移动端宽度。

产出：

- 自动化测试或手工测试清单。

验收：

- 需求文档第 14 节验收标准全部覆盖。

## M9 联调与验收

### T9.1 本地完整启动联调

目标：确认前后端组合运行。

推荐上下文：

- README 或启动脚本。
- `.env.example`。

执行内容：

- 启动后端。
- 启动前端。
- 访问首页。
- 请求 `/api/matches`。

产出：

- 本地运行说明更新。

验收：

- 首页能正常请求接口。
- 控制台无关键错误。

### T9.2 真实 PandaScore token 联调

目标：验证真实数据链路。

推荐上下文：

- `detailed-design.md` 第 8 节、第 11 节。
- PandaScore client 文件。

执行内容：

- 使用本地 `.env.local` token。
- 验证三个游戏 endpoint。
- 检查字段是否存在缺失或变化。
- 必要时调整 mapper。

产出：

- 真实数据联调修正。

验收：

- CS2、VALORANT、LoL 至少能请求成功。
- 真实数据可被前端展示。

### T9.3 按验收标准最终检查

目标：完成 MVP 出口检查。

推荐上下文：

- `requirements.md` 第 14 节。
- `detailed-design.md` 第 14.4 节。

执行内容：

- 逐项检查首页、时间、排序、筛选、日期、空状态、错误状态、响应式。
- 记录未完成项。
- 修复阻塞性问题。

产出：

- 最终验收结果。

验收：

- MVP 验收标准全部通过，或明确列出剩余风险。

## 5. 推荐执行顺序

```text
M0 项目骨架
  -> M1 类型与工具
  -> M2 后端核心 API
  -> M3 PandaScore 接入
  -> M4 缓存与降级
  -> M5 前端数据层
  -> M6 前端 UI
  -> M7 状态与体验完善
  -> M8 测试
  -> M9 联调与验收
```

如果希望尽快看到页面效果，可以采用双线推进：

```text
后端线：M0 -> M1 -> M2 -> M3 -> M4
前端线：M0 -> M1 -> M5 -> M6 -> M7
收口线：M8 -> M9
```

前端线在后端真实数据完成前可使用 `/api/matches` mock 响应开发，后续再切换真实 PandaScore 数据。

## 6. 单次任务提示词模板

后续可以按下面模板交给模型执行：

```text
请执行 implementation-tasks.md 中的 T{编号}。

必读上下文：
- requirements.md 的第 {章节} 节
- detailed-design.md 的第 {章节} 节
- 当前任务涉及的源码文件

要求：
- 只完成 T{编号} 的范围，不做无关重构。
- 修改完成后运行相关检查或说明无法运行的原因。
- 最后给出改动摘要、验证结果、下一步建议。
```

## 7. 任务粒度调整建议

- 如果模型上下文较小：每次只执行一个 T 任务。
- 如果模型上下文较大：可以合并同一模块内连续任务，例如 T1.1 + T1.2，或 T6.2 + T6.3。
- 不建议合并 M3 和 M6，因为真实数据接入和 UI 细节都容易占用大量上下文。
- 不建议先写大量测试再实现核心逻辑；本项目更适合先完成可运行链路，再补关键路径测试。
- 任何涉及 PandaScore 当前 endpoint 的任务，都应优先查看官方文档或根据真实响应调整 mapper。

