# 电竞赛程聚合网站详细设计文档

## 1. 文档说明

本文档基于 `requirements.md` 编写，用于指导电竞赛程聚合网站 MVP 的设计与实现。项目定位为个人使用的赛程效率工具，第一版重点保证数据获取稳定、时间处理准确、列表展示清晰、筛选切换顺畅。

## 2. 设计目标

### 2.1 核心目标

- 聚合展示 CS2、VALORANT、英雄联盟三类电竞赛程。
- 默认展示北京时间当天赛程，并支持切换到明天。
- 所有比赛按北京时间开始时间升序展示。
- 支持按游戏项目筛选。
- 通过后端代理访问 PandaScore API，避免前端暴露 token。
- 通过缓存降低外部 API 调用频率。
- 在桌面和手机浏览器中均可正常浏览。

### 2.2 设计边界

MVP 不实现用户系统、社区能力、实时比赛数据、赔率预测、多数据源融合、公开运营后台。后续扩展能力应以不破坏现有 API 响应结构为前提逐步加入。

## 3. 总体架构

### 3.1 推荐技术栈

- 前端：React + Vite。
- 后端：Node.js + Express。
- 数据源：PandaScore API。
- 缓存：MVP 使用内存缓存；后续可替换为本地 JSON、SQLite 或 Redis。
- 运行方式：本地启动前后端；后续可部署到 Vercel、Railway、Render 等平台。

### 3.2 架构图

```text
Browser
  |
  | HTTP
  v
React Frontend
  |
  | GET /api/matches?date=YYYY-MM-DD&game=all|cs2|valorant|lol
  v
Express Backend
  |
  | read/write
  v
Cache Layer
  |
  | cache miss / refresh
  v
PandaScore API
```

### 3.3 职责划分

前端负责页面展示、筛选交互、日期切换、加载状态、错误状态和空状态。后端负责参数校验、时区日期范围计算、PandaScore 请求、数据归一化、排序和缓存。PandaScore 只作为原始数据来源，不直接被浏览器访问。

## 4. 模块设计

### 4.1 前端模块

```text
src/
  main.tsx
  App.tsx
  api/
    matches.ts
  components/
    HeaderBar.tsx
    GameFilter.tsx
    DateSwitch.tsx
    MatchList.tsx
    MatchItem.tsx
    StatusBadge.tsx
    EmptyState.tsx
    ErrorState.tsx
    LoadingState.tsx
  hooks/
    useMatches.ts
  types/
    match.ts
  utils/
    date.ts
```

#### 4.1.1 页面容器 `App`

职责：

- 管理当前日期类型：今天或明天。
- 管理游戏筛选：全部、CS2、VALORANT、英雄联盟。
- 调用 `useMatches` 获取赛程。
- 根据请求状态渲染 loading、error、empty 或列表。

#### 4.1.2 数据请求 `api/matches.ts`

职责：

- 封装 `GET /api/matches`。
- 将前端状态转换为接口参数。
- 处理非 2xx 响应并抛出统一错误。

#### 4.1.3 `useMatches`

职责：

- 监听 `date` 和 `game` 变化。
- 管理 `loading`、`error`、`data`、`refresh`。
- 支持手动刷新。
- 可选：使用 `AbortController` 取消过期请求，避免快速切换时旧响应覆盖新状态。

#### 4.1.4 组件设计

- `HeaderBar`：展示站点名称、当前日期、刷新按钮。
- `GameFilter`：展示全部、CS2、VALORANT、LoL 分段筛选。
- `DateSwitch`：展示今天、明天、回到今天等日期控制。
- `MatchList`：接收比赛数组并渲染列表。
- `MatchItem`：展示单场比赛信息。
- `StatusBadge`：将状态码转换为中文标签。
- `EmptyState`：展示无比赛提示。
- `ErrorState`：展示错误提示和重试按钮。
- `LoadingState`：展示简洁加载状态。

### 4.2 后端模块

```text
server/
  index.ts
  routes/
    matches.ts
  services/
    pandascoreClient.ts
    matchService.ts
    cacheService.ts
  mappers/
    pandascoreMapper.ts
  utils/
    dateRange.ts
    errors.ts
  types/
    match.ts
    pandascore.ts
```

#### 4.2.1 路由层 `routes/matches.ts`

职责：

- 接收 `/api/matches` 请求。
- 校验 `date` 和 `game` 参数。
- 调用 `matchService.getMatches`。
- 返回统一 JSON 响应。

#### 4.2.2 业务层 `matchService.ts`

职责：

- 根据北京时间日期计算 UTC 查询范围。
- 根据 `game` 参数决定要查询的项目。
- 读取缓存；缓存命中时直接返回。
- 缓存未命中时请求 PandaScore。
- 将不同项目结果归一化、合并、排序。
- 外部请求失败且存在过期缓存时，返回旧缓存并标记 `stale: true`。

#### 4.2.3 PandaScore 客户端 `pandascoreClient.ts`

职责：

- 封装 PandaScore API token。
- 设置请求超时。
- 处理 HTTP 错误、限流错误和网络错误。
- 只返回原始数据，不处理业务字段。

#### 4.2.4 映射层 `pandascoreMapper.ts`

职责：

- 将 PandaScore 原始 match 数据转换为内部 `Match`。
- 统一游戏类型、赛事名称、队伍字段、状态字段和 BO 信息。
- 对缺失字段给出安全默认值。

#### 4.2.5 缓存层 `cacheService.ts`

职责：

- 维护内存缓存 Map。
- 支持按 key 读取、写入、判断是否过期。
- 支持读取过期缓存作为兜底。

## 5. 接口设计

### 5.1 获取赛程

```http
GET /api/matches?date=2026-05-24&game=all
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | string | 是 | 北京时间日期，格式 `YYYY-MM-DD` |
| `game` | string | 否 | `all`、`cs2`、`valorant`、`lol`，默认 `all` |

#### 成功响应

```json
{
  "date": "2026-05-24",
  "timezone": "Asia/Shanghai",
  "game": "all",
  "stale": false,
  "updatedAt": "2026-05-23T16:10:00.000Z",
  "matches": [
    {
      "id": "pandascore-match-id",
      "game": "lol",
      "league": "LPL",
      "tournament": "LPL 2026 Spring",
      "beginAt": "2026-05-24T11:00:00.000Z",
      "displayDate": "2026-05-24",
      "displayTime": "19:00",
      "status": "not_started",
      "bestOf": 3,
      "teams": [
        {
          "name": "Team A",
          "acronym": "TA",
          "imageUrl": null
        },
        {
          "name": "Team B",
          "acronym": "TB",
          "imageUrl": null
        }
      ],
      "streamUrl": null
    }
  ]
}
```

#### 错误响应

```json
{
  "error": {
    "code": "PANDASCORE_REQUEST_FAILED",
    "message": "赛程数据暂时获取失败，请稍后重试。"
  }
}
```

#### 状态码约定

| HTTP 状态码 | 场景 |
| --- | --- |
| 200 | 请求成功 |
| 400 | 参数格式错误或不支持的游戏类型 |
| 500 | 服务端未配置 token 或内部错误 |
| 502 | PandaScore 请求失败且无可用缓存 |
| 504 | PandaScore 请求超时且无可用缓存 |

## 6. 数据模型设计

### 6.1 前后端共享模型

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

### 6.2 状态映射

| PandaScore 状态 | 内部状态 | 中文展示 |
| --- | --- | --- |
| `not_started` | `not_started` | 未开始 |
| `running` | `running` | 进行中 |
| `finished` | `finished` | 已结束 |
| `postponed` | `postponed` | 已延期 |
| `canceled` / `cancelled` | `cancelled` | 已取消 |
| 其他或缺失 | `not_started` | 未开始 |

### 6.3 游戏映射

| 内部类型 | PandaScore 项目 |
| --- | --- |
| `cs2` | Counter-Strike / CS2 对应 endpoint |
| `valorant` | VALORANT 对应 endpoint |
| `lol` | League of Legends 对应 endpoint |

实际实现时应以 PandaScore 当前文档 endpoint 为准，并在 `pandascoreClient` 中集中维护 endpoint 映射，避免散落在业务代码中。

## 7. 时间与时区设计

### 7.1 日期基准

所有日期筛选以北京时间 `Asia/Shanghai` 为准。例如用户选择 `2026-05-24`，后端应查询：

```text
北京时间：2026-05-24 00:00:00 到 2026-05-24 23:59:59
UTC：     2026-05-23 16:00:00 到 2026-05-24 15:59:59
```

### 7.2 处理原则

- 后端接收 `YYYY-MM-DD`，按北京时间解释。
- 后端请求 PandaScore 时使用 UTC ISO 时间范围。
- 内部 `beginAt` 保留 UTC ISO 字符串。
- `displayDate` 和 `displayTime` 由后端按北京时间生成，前端直接展示。
- 排序使用 `beginAt` 的 UTC 时间戳，避免字符串排序和时区误差。

### 7.3 推荐工具

MVP 可使用 `date-fns` + `date-fns-tz`，或使用原生 `Intl.DateTimeFormat`。若使用 Next.js 或现代 Node.js 环境，也可以只用 `Intl` 完成展示格式化，但日期范围换算应保留单元测试。

## 8. PandaScore 数据获取设计

### 8.1 查询策略

当 `game=all` 时，后端并发请求三个项目的赛程，再合并排序。当 `game` 为单一项目时，只请求对应项目。

```text
all:
  Promise.all([
    fetchMatches("cs2", range),
    fetchMatches("valorant", range),
    fetchMatches("lol", range)
  ])

single:
  fetchMatches(game, range)
```

### 8.2 请求参数

应优先使用 PandaScore 支持的日期或时间范围过滤能力，按 `begin_at` 查询指定日期范围。请求应设置合理分页参数，MVP 可先取前 100 条；如果某天赛事超过分页上限，再补充分页循环。

### 8.3 字段归一化

映射字段建议：

| 内部字段 | PandaScore 来源 |
| --- | --- |
| `id` | match `id` |
| `game` | 当前 endpoint 或 videogame 信息 |
| `league` | `league.name` |
| `tournament` | `serie.full_name`、`tournament.name` 或组合名称 |
| `beginAt` | `begin_at` |
| `status` | `status` |
| `bestOf` | `number_of_games` |
| `teams` | `opponents[].opponent` |
| `streamUrl` | `streams_list[0].raw_url` 或 null |

队伍缺失时展示 `TBD`。若只有一支队伍，另一侧也展示 `TBD`，保证卡片布局稳定。

## 9. 缓存设计

### 9.1 缓存 Key

```text
matches:{date}:{game}
```

示例：

```text
matches:2026-05-24:all
matches:2026-05-24:lol
```

### 9.2 缓存结构

```ts
type CacheEntry<T> = {
  value: T;
  createdAt: number;
  expiresAt: number;
};
```

### 9.3 过期策略

- 默认 TTL：15 分钟。
- 允许配置范围：10 到 30 分钟。
- 缓存命中且未过期：直接返回。
- 缓存过期：重新请求 PandaScore。
- 刷新失败且有旧缓存：返回旧缓存，响应中 `stale: true`。
- 刷新失败且无旧缓存：返回错误响应。

### 9.4 手动刷新

前端刷新按钮可调用同一接口并追加参数：

```http
GET /api/matches?date=2026-05-24&game=all&refresh=1
```

后端收到 `refresh=1` 时跳过未过期缓存，主动请求 PandaScore。该能力可作为 MVP 增强项实现；如果第一版不做，刷新按钮可以重新触发普通请求。

## 10. 前端交互设计

### 10.1 页面布局

```text
Header
  站点名称 / 当前日期 / 刷新按钮

Controls
  游戏筛选：全部 CS2 VALORANT LoL
  日期切换：今天 明天

Main
  LoadingState
  ErrorState
  EmptyState
  MatchList

Footer
  数据来源：PandaScore
```

### 10.2 比赛列表项

每条比赛展示：

- 开始时间：如 `19:00`。
- 游戏标签：`CS2`、`VALORANT`、`LoL`。
- 赛事名称：优先展示归一化后的 `tournament`。
- 队伍：`Team A vs Team B`。
- BO：如 `BO3`，缺失时不展示或展示 `BO?`。
- 状态：未开始、进行中、已结束、已延期、已取消。

### 10.3 空状态

空状态文案根据场景区分：

- 全部游戏无比赛：`今天暂无已收录赛程。`
- 筛选后无比赛：`当前筛选条件下没有比赛。`

### 10.4 错误状态

错误状态展示：

- 简洁提示：`赛程数据暂时获取失败。`
- 重试按钮。
- 如果响应为旧缓存：列表仍展示，但顶部显示 `数据可能不是最新`。

### 10.5 响应式设计

- 桌面端：列表内容横向展开，时间、标签、队伍和状态在一行内可快速扫读。
- 手机端：比赛卡片改为两行或三行展示，优先保证时间、队伍、赛事名可读。
- 控件使用紧凑分段按钮，避免占用过多首屏空间。

## 11. 环境变量与配置

```env
PANDASCORE_API_TOKEN=your_api_token_here
DEFAULT_TIMEZONE=Asia/Shanghai
CACHE_TTL_SECONDS=900
PANDASCORE_REQUEST_TIMEOUT_MS=8000
```

要求：

- `.env.local` 不提交到 Git。
- 后端启动时检查 `PANDASCORE_API_TOKEN`，缺失时返回明确错误。
- 前端不得读取或暴露 PandaScore token。

## 12. 错误处理设计

### 12.1 后端错误类型

| 错误码 | 场景 | 前端提示 |
| --- | --- | --- |
| `INVALID_DATE` | 日期格式错误 | 日期格式不正确 |
| `INVALID_GAME` | 游戏类型不支持 | 不支持的游戏筛选 |
| `TOKEN_MISSING` | 未配置 API token | 服务端未配置数据源 |
| `PANDASCORE_REQUEST_FAILED` | PandaScore 请求失败 | 赛程数据暂时获取失败 |
| `PANDASCORE_TIMEOUT` | PandaScore 请求超时 | 赛程数据请求超时 |
| `INTERNAL_ERROR` | 未预期错误 | 服务暂时不可用 |

### 12.2 降级策略

- 有旧缓存时优先返回旧缓存，降低页面不可用概率。
- 无缓存时返回错误状态，不展示伪造数据。
- 单个游戏请求失败时：
  - 如果 `game` 为单一项目：整体失败或返回该项目旧缓存。
  - 如果 `game=all`：MVP 建议整体失败并使用 `all` 旧缓存；后续可支持部分成功提示。

## 13. 安全与合规

- API token 只保存在服务端环境变量中。
- 不在浏览器、日志、错误响应中输出 token。
- 不接入博彩、赔率或预测相关内容。
- 项目个人使用，不对外公开运营；公开发布前需重新确认 PandaScore 授权条款。

## 14. 测试方案

### 14.1 单元测试

重点覆盖：

- 北京时间日期转 UTC 范围。
- PandaScore 状态映射。
- 队伍字段缺失时的 `TBD` 处理。
- 比赛排序。
- 缓存命中、过期和 stale 兜底逻辑。
- 参数校验。

### 14.2 集成测试

重点覆盖：

- `GET /api/matches` 正常返回。
- 不同 `game` 参数返回正确筛选。
- PandaScore 失败时有旧缓存返回 stale 数据。
- PandaScore 失败且无缓存时返回错误。

### 14.3 前端测试

重点覆盖：

- 初始进入页面展示今天赛程。
- 切换今天和明天后重新请求。
- 切换游戏筛选后列表更新。
- loading、error、empty 状态正确展示。
- 手机宽度下内容不溢出。

### 14.4 手工验收

按需求文档第 14 节逐项验收：

- 首页展示今天赛程。
- 时间为北京时间。
- 比赛按开始时间升序排列。
- 可以筛选 CS2、VALORANT、LoL。
- 可以切换今天和明天。
- 无比赛时有明确空状态。
- API 请求失败时有明确错误提示。
- 桌面和手机宽度均可正常浏览。

## 15. 实施计划

### 15.1 阶段一：项目骨架

- 初始化前端和后端项目。
- 配置 TypeScript、Lint、环境变量。
- 建立共享类型或前后端各自类型文件。

### 15.2 阶段二：后端 API

- 实现 `/api/matches` 路由。
- 实现参数校验、日期范围计算、PandaScore client。
- 实现数据归一化和排序。
- 实现内存缓存和 stale 兜底。

### 15.3 阶段三：前端页面

- 实现页面结构和基础样式。
- 实现游戏筛选、日期切换、刷新按钮。
- 实现加载、错误、空状态。
- 实现比赛列表和响应式布局。

### 15.4 阶段四：测试与验收

- 补充时间、映射、缓存单元测试。
- 使用模拟数据验证 UI。
- 使用真实 PandaScore token 做本地联调。
- 按验收标准检查桌面和手机宽度。

## 16. 后续扩展预留

后续功能建议在不改变核心 `Match` 模型的基础上扩展：

- 本周赛程视图：增加 `range` 或 `startDate/endDate` 参数。
- 收藏队伍：增加本地存储或轻量数据库。
- 只显示收藏队伍：前端或后端增加过滤逻辑。
- 开赛提醒：结合浏览器通知、系统通知或消息机器人。
- 直播链接：增强 `streamUrl` 字段来源和展示。
- ICS 导出：基于归一化后的 Match 生成日历订阅。
- 多数据源补充：在 service 层增加 provider 聚合，不影响前端调用。

