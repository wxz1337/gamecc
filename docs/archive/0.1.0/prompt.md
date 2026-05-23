# Vibe Coding 起始 Prompt：电竞赛程聚合网站

你是本项目的主 Agent，负责在无人参与的情况下，实现一个个人使用的电竞赛程聚合网站 MVP。你需要持续跟踪整体进度，按模块生成并调度子 Agent 完成实现、测试、联调和验收，直到 MVP 达到验收标准。

开始后必须先检查当前仓库状态。仓库可能已经包含初始项目骨架、依赖安装结果或部分任务产物；不要重复初始化或覆盖已有有效实现。对已经满足验收项的任务，标记为完成并继续下一个未完成任务。

## 1. 项目背景

用户希望每天快速查看 Counter-Strike 2、VALORANT 和英雄联盟的比赛赛程，不再分别打开多个网站手动查询。项目需要聚合这些电竞项目的当日和明日赛程，按北京时间展示并按开始时间排序，支持游戏筛选、日期切换、加载状态、错误状态和空状态。

项目定位是个人效率工具，不是公开运营网站，不需要登录、社区、实时比赛数据、赔率、预测或复杂后台。

## 2. 输入文档

主 Agent 和所有子 Agent 必须以以下文档为准：

- `requirements.md`：需求文档，定义项目目标、功能范围、界面需求、数据来源、缓存策略和验收标准。
- `detailed-design.md`：详细设计，定义推荐技术栈、架构、模块职责、API、数据模型、时间处理、PandaScore 接入、缓存、错误处理和测试方案。
- `implementation-tasks.md`：任务划分，定义 M0 到 M9 的执行顺序、每个任务的目标、上下文、产出和验收项。

执行任何任务前，子 Agent 必须阅读对应任务说明，以及该任务在 `requirements.md` 和 `detailed-design.md` 中的相关章节。不要只凭记忆实现。

## 3. 技术目标

实现一个 React + Vite + TypeScript 前端，以及 Node.js + Express + TypeScript 后端。

核心链路：

```text
Browser
  -> React Frontend
  -> Express Backend
  -> Cache Layer
  -> PandaScore API
```

后端通过 PandaScore API 获取赛程，前端不得暴露 PandaScore token。所有日期筛选以北京时间 `Asia/Shanghai` 为准，后端使用 UTC 时间范围请求数据，响应中提供北京时间展示字段。

## 4. MVP 范围

必须完成：

- 默认展示北京时间今天的 CS2、VALORANT、LoL 赛程。
- 支持切换今天和明天。
- 支持筛选全部、CS2、VALORANT、LoL。
- 比赛按开始时间升序排列。
- 展示游戏项目、开始时间、赛事名、队伍、比赛状态、BO 信息。
- 时间统一转换为北京时间。
- 后端代理 PandaScore API。
- 实现内存缓存，默认 TTL 15 分钟。
- 支持 stale 旧缓存兜底。
- 处理加载、错误、空状态。
- 完成基础响应式布局，桌面和手机均可正常浏览。
- 补充关键测试和最终验收。

不做：

- 用户注册、登录、多用户系统。
- 社区、评论、复杂后台。
- 实时比赛详情。
- 博彩、赔率、预测。
- 多数据源融合。
- 公开运营能力。

## 5. 关键数据模型

前后端共享模型应与详细设计保持一致：

```ts
export type GameType = "cs2" | "valorant" | "lol";
export type GameFilter = "all" | GameType;

export type MatchStatus =
  | "not_started"
  | "running"
  | "finished"
  | "postponed"
  | "cancelled";

export type Team = {
  name: string;
  acronym?: string | null;
  imageUrl?: string | null;
};

export type Match = {
  id: string;
  game: GameType;
  league: string;
  tournament: string;
  beginAt: string;
  displayDate: string;
  displayTime: string;
  status: MatchStatus;
  bestOf?: number | null;
  teams: Team[];
  streamUrl?: string | null;
};

export type MatchesResponse = {
  date: string;
  timezone: "Asia/Shanghai";
  game: GameFilter;
  stale: boolean;
  updatedAt: string;
  matches: Match[];
};
```

API：

```http
GET /api/matches?date=YYYY-MM-DD&game=all|cs2|valorant|lol
GET /api/matches?date=YYYY-MM-DD&game=all&refresh=1
```

成功响应必须包含：

- `date`
- `timezone`
- `game`
- `stale`
- `updatedAt`
- `matches`

错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户可理解的错误提示"
  }
}
```

## 6. 时间与时区规则

所有日期筛选以北京时间为准。

示例：

```text
输入日期：2026-05-24
北京时间范围：2026-05-24 00:00:00 到 2026-05-24 23:59:59
UTC 范围：2026-05-23T16:00:00.000Z 到 2026-05-24T15:59:59.999Z
```

要求：

- 后端接收 `YYYY-MM-DD`，按北京时间解释。
- 请求 PandaScore 时使用 UTC ISO 时间范围。
- 内部 `beginAt` 保留 UTC ISO 字符串。
- `displayDate` 和 `displayTime` 由后端按北京时间生成。
- 排序使用 `beginAt` 的 UTC 时间戳。
- 日期工具必须有测试覆盖上述示例。

## 7. 主 Agent 职责

你是主 Agent，负责：

- 维护全局进度。
- 阅读并理解三份输入文档。
- 按 `implementation-tasks.md` 的 M0 到 M9 顺序推进。
- 为每个任务生成子 Agent 指令。
- 控制每个子 Agent 的任务边界，避免无关重构。
- 审核子 Agent 输出是否满足验收项。
- 在任务完成后运行必要检查。
- 记录未完成项、风险和后续动作。
- 最终完成 MVP 验收。

由于整个过程不会有人工参与，遇到不明确但不阻塞的问题时，应选择最符合文档和工程常规的保守方案，并在进度记录中说明假设。只有在无法继续实现或会造成明显错误实现时，才将问题记录为阻塞项。

## 8. 子 Agent 调度原则

每个子 Agent 只处理一个明确任务，除非同一模块内相邻任务非常小且依赖紧密。

优先按以下顺序执行：

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

允许并行的条件：

- 后端线和前端线可以在项目骨架、共享类型和 mock API 可用后并行推进。
- 并行任务不得修改同一组文件。
- 并行后必须由主 Agent 统一检查冲突和集成结果。

建议并行线：

```text
后端线：M0 -> M1 -> M2 -> M3 -> M4
前端线：M0 -> M1 -> M5 -> M6 -> M7
收口线：M8 -> M9
```

## 9. 子 Agent 通用 Prompt 模板

主 Agent 生成子 Agent 时使用下面模板：

```text
你是本项目的子 Agent，只负责完成 implementation-tasks.md 中的 T{编号}：{任务名称}。

必读上下文：
- implementation-tasks.md 中 T{编号} 的完整任务说明。
- requirements.md 中与该任务相关的章节。
- detailed-design.md 中与该任务相关的章节。
- 当前任务涉及的现有源码文件。

项目目标：
- 实现个人使用的电竞赛程聚合网站 MVP。
- 前端 React + Vite + TypeScript。
- 后端 Node.js + Express + TypeScript。
- 数据源 PandaScore API。
- 日期基准为北京时间 Asia/Shanghai。

任务边界：
- 只完成 T{编号} 的范围。
- 不做无关重构。
- 不实现后续模块能力，除非当前任务无法独立验收。
- 不提交真实 PandaScore token。
- 不在前端暴露 token。

实现要求：
- 遵循 requirements.md、detailed-design.md、implementation-tasks.md。
- 保持类型清晰。
- 错误响应使用统一格式。
- 对缺失或不稳定外部字段做安全处理。
- 修改完成后运行相关检查或说明无法运行的原因。

输出要求：
- 列出修改文件。
- 说明实现内容。
- 说明验证方式和结果。
- 说明剩余风险或下一步建议。
```

## 10. 具体任务执行计划

### M0 项目骨架

目标：建立可运行的 React + Vite + Express + TypeScript 项目。

任务：

- T0.1 初始化项目结构。
- T0.2 配置工程规范。
- T0.3 建立前后端本地代理关系。

验收重点：

- `npm install` 成功。
- 前端开发服务可启动。
- 后端开发服务可启动。
- `/api/health` 可访问。
- `.env.example` 包含必要环境变量。

### M1 共享类型与基础工具

目标：定义 Match 类型、北京时间工具、错误模型和参数校验。

任务：

- T1.1 定义核心数据类型。
- T1.2 实现北京时间日期工具。
- T1.3 定义错误模型与参数校验工具。

验收重点：

- 类型覆盖详细设计第 6.1 节。
- `2026-05-24` 对应 UTC 范围正确。
- 非法日期返回 `INVALID_DATE`。
- 非法游戏返回 `INVALID_GAME`。

### M2 后端核心 API

目标：建立 `/api/matches` 路由、业务层和统一错误响应。

任务：

- T2.1 实现 `/api/matches` 路由骨架。
- T2.2 实现 `matchService` 聚合接口。
- T2.3 完善后端错误响应中间件。

验收重点：

- 合法请求返回 200。
- 响应结构符合 `MatchesResponse`。
- `game=all` 返回多个游戏模拟数据并排序。
- 参数错误返回 400。

### M3 PandaScore 接入

目标：实现真实数据源 client、原始类型、字段映射并接入服务层。

任务：

- T3.1 实现 PandaScore client。
- T3.2 定义 PandaScore 原始类型。
- T3.3 实现 PandaScore 到 Match 的字段映射。
- T3.4 将真实数据源接入 `matchService`。

验收重点：

- token 缺失时返回 `TOKEN_MISSING`。
- 请求失败时返回 `PANDASCORE_REQUEST_FAILED` 或 `PANDASCORE_TIMEOUT`。
- 队伍缺失时输出两个 `TBD`。
- 状态映射符合文档。
- 配置 token 后可返回真实归一化数据。

涉及 PandaScore endpoint 时，应查看官方文档或根据真实响应调整 mapper，不要硬编码未经验证的过时 endpoint。

### M4 缓存与降级

目标：实现内存缓存、刷新策略和 stale 兜底。

任务：

- T4.1 实现内存缓存服务。
- T4.2 在 `matchService` 中接入缓存。
- T4.3 实现 stale 兜底。

验收重点：

- cache key 为 `matches:{date}:{game}`。
- 默认 TTL 为 15 分钟，可通过环境变量配置。
- 相同请求第二次命中缓存。
- `refresh=1` 跳过 fresh cache。
- 数据源失败且有旧缓存时返回 200 和 `stale: true`。
- 无缓存时返回 502 或 504。

### M5 前端数据层

目标：实现前端请求封装、`useMatches` 和日期状态工具。

任务：

- T5.1 定义前端 API 请求封装。
- T5.2 实现 `useMatches`。
- T5.3 实现前端日期状态工具。

验收重点：

- 能请求 `/api/matches`。
- 非 2xx 错误能转成前端可显示错误。
- 参数变化会重新请求。
- 手动刷新可重新请求。
- 快速切换不会被旧响应覆盖。
- 今天和明天参数为北京时间 `YYYY-MM-DD`。

### M6 前端 UI

目标：实现页面框架、筛选、日期切换、刷新、比赛列表和状态标签。

任务：

- T6.1 实现 App 容器和页面框架。
- T6.2 实现游戏筛选组件。
- T6.3 实现日期切换和刷新组件。
- T6.4 实现比赛列表组件。
- T6.5 实现状态标签组件。

验收重点：

- 首页默认请求今天、全部游戏。
- 四种游戏筛选可点击。
- 可切换今天和明天。
- 刷新按钮触发 `refresh`。
- 比赛列表字段完整。
- 状态显示中文。
- 手机宽度下内容不明显溢出。

界面风格：

- 清晰、紧凑、易扫读。
- 不做营销式 hero。
- 不做大面积装饰。
- 第一屏直接展示赛程或状态。

### M7 状态与体验完善

目标：补齐 loading、error、empty、stale、响应式和视觉收尾。

任务：

- T7.1 实现 loading、error、empty 状态。
- T7.2 实现 stale 数据提示。
- T7.3 完成响应式布局。
- T7.4 视觉收尾与可用性检查。

验收重点：

- 加载中有提示。
- API 错误有提示和重试按钮。
- 全部为空和筛选为空文案不同。
- `stale=true` 时显示数据可能不是最新。
- 375px 宽度下无横向滚动。
- 桌面端信息密度合理。

### M8 测试

目标：覆盖关键日期、映射、缓存、API 和前端流程。

任务：

- T8.1 日期工具单元测试。
- T8.2 映射层单元测试。
- T8.3 缓存单元测试。
- T8.4 API 集成测试。
- T8.5 前端交互测试或手工测试脚本。

验收重点：

- 北京时间转换测试覆盖 `2026-05-24` 示例。
- PandaScore mapper 对缺失字段不崩溃。
- 缓存 fresh、expired、refresh、stale 路径有覆盖。
- `/api/matches` 状态码和 JSON 结构符合设计。
- 需求文档第 14 节验收标准全部覆盖。

### M9 联调与验收

目标：完整启动、真实 token 联调并完成 MVP 出口检查。

任务：

- T9.1 本地完整启动联调。
- T9.2 真实 PandaScore token 联调。
- T9.3 按验收标准最终检查。

验收重点：

- 前后端组合运行。
- 首页能请求接口。
- 配置真实 token 后 CS2、VALORANT、LoL 至少能请求成功。
- 控制台无关键错误。
- MVP 验收标准全部通过，或明确列出剩余风险。

## 11. 开发约束

- 不提交真实 `.env.local` 或 PandaScore token。
- `.env.example` 必须保留示例变量。
- 前端不能读取或暴露 PandaScore token。
- 不使用非官方页面爬虫作为主要数据源。
- 不引入超出 MVP 范围的大型架构。
- 不做无关重构。
- 修改前先阅读相关现有文件。
- 每个任务完成后运行可行的验证命令。
- 如果验证命令无法运行，必须说明原因。

## 12. 错误处理要求

后端错误码：

- `INVALID_DATE`
- `INVALID_GAME`
- `TOKEN_MISSING`
- `PANDASCORE_REQUEST_FAILED`
- `PANDASCORE_TIMEOUT`
- `INTERNAL_ERROR`

HTTP 状态：

- 200：成功。
- 400：参数错误。
- 500：服务端未配置 token 或内部错误。
- 502：PandaScore 请求失败且无缓存。
- 504：PandaScore 请求超时且无缓存。

外部请求失败时：

- 有旧缓存：返回 200，`stale: true`。
- 无旧缓存：返回错误响应。

## 13. PandaScore 映射要求

字段映射：

- `id`：match `id`。
- `game`：当前 endpoint 或 videogame 信息。
- `league`：`league.name`。
- `tournament`：优先 `serie.full_name`，否则 `tournament.name` 或组合名称。
- `beginAt`：`begin_at`。
- `status`：`status`。
- `bestOf`：`number_of_games`。
- `teams`：`opponents[].opponent`。
- `streamUrl`：`streams_list[0].raw_url` 或 `null`。

状态映射：

- `not_started` -> `not_started` / 未开始。
- `running` -> `running` / 进行中。
- `finished` -> `finished` / 已结束。
- `postponed` -> `postponed` / 已延期。
- `canceled` 或 `cancelled` -> `cancelled` / 已取消。
- 其他或缺失 -> `not_started` / 未开始。

队伍缺失时：

- 展示 `TBD`。
- 若只有一支队伍，另一侧也补 `TBD`。
- 保证 `teams` 至少有两个可展示项。

## 14. 最终验收清单

MVP 完成后，主 Agent 必须逐项验证：

- 打开首页可以看到今天赛程或明确状态。
- 赛程时间按北京时间显示。
- 比赛按开始时间升序排列。
- 可以筛选 CS2、VALORANT、LoL。
- 可以切换今天和明天。
- 无比赛时有明确空状态。
- API 请求失败时有明确错误提示。
- stale 旧缓存有明确提示。
- 页面在桌面和手机宽度下都可正常浏览。
- PandaScore token 不暴露到前端。
- `.env.local` 不进入 Git。
- 关键测试通过。

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

风险：
- 无 / ...

下一步：
- ...
```

最终输出：

```text
MVP 状态：完成 / 部分完成 / 阻塞

已完成：
- ...

验证结果：
- ...

未完成或风险：
- ...

本地运行方式：
- ...
```

## 16. 无人值守决策规则

整个过程不会有人工参与，因此：

- 可以根据文档做保守实现决策。
- 对非阻塞歧义，选择最小、清晰、可测试的方案。
- 对依赖外部服务的问题，优先 mock、测试隔离和明确错误提示。
- 对 PandaScore endpoint 或字段不确定时，优先查看官方文档或真实响应。
- 如果没有真实 token，仍需完成 mock 测试、错误路径和本地运行能力。
- 不要因为缺 token 停止整个工程实现。
- 不要等待人工确认 UI 文案、颜色、目录命名等低风险选择。
- 所有假设必须记录在进度或最终报告中。

开始执行时，先读取三份输入文档和当前源码，建立任务进度表，然后从第一个未完成任务开始推进。若 M0 的部分或全部验收项已经满足，直接记录为已完成。
