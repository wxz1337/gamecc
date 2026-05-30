# Esports Schedule Aggregator

个人使用的电竞赛程聚合工具，用于按北京时间查看 LoL、CS2 和 VALORANT 比赛。项目基于 React + Vite + Express + TypeScript，前端只访问本项目后端，后端代理 PandaScore API 并隐藏 token。

## 当前版本

- 版本：`0.7.0`
- 状态：Supabase 使用优化版已完成
- 运行方式：本地开发服务，支持生产构建
- 数据源：PandaScore API

详细状态见 [docs/project-status.md](./docs/project-status.md)。

## 已实现能力

- 默认定位北京时间当天赛程，按当前状态展示对应比赛。
- 选择日期后以当天为时间线起点，向下滚动加载到本周最后一天；更早日期需要通过日期栏选择对应日期查看。
- 支持自然周日期条、前一天/后一天切换和自定义日期选择。
- 支持全部、LoL、CS2、VALORANT 游戏筛选。
- 支持随游戏变化的赛区筛选。
- 支持 PandaScore 赛事级别筛选：全部、S、A、B、C。
- 支持进行中&未开始、已结束两种状态筛选；两种状态都从选中日期开始按时间正序展示到本周最后一天。
- 使用 Tailwind CSS、shadcn/ui 风格基础组件、lucide-react 和 framer-motion 重构 UI。
- 首页提供当前日期、已载入赛事数、进行中赛事数和今日/当日重点赛事。
- 通过后端代理请求 PandaScore，前端不暴露 token。
- 支持内存响应缓存、Supabase 持久化窗口缓存、手动刷新和 stale 兜底。
- Supabase 服务端访问已加入 schema 类型、显式字段查询、分片写入和查询索引优化。
- 后端使用请求合并避免相同源窗口并发重复拉取 PandaScore。
- 前端首屏与日期切换会批量加载到本周最后一天，减少按天重复请求。
- 展示比赛时间、项目、赛事、队伍、状态和 BO 赛制。
- 支持展开比赛详情，查看比分、胜者、来源、更新时间和小局摘要。
- 页面 URL 会保留筛选条件，刷新后恢复当前查询。
- LoL 和 VALORANT 比赛提供个人常用 B 站直播入口。
- 展示 PandaScore 免费接口可用的扩展信息：
  - 队伍 logo、缩写、地区
  - 比分、胜者
  - 结束时间、原定时间、重赛标记
  - 单局摘要、局时长、单局胜者
  - 赛事国家、赛区、等级、奖金池、淘汰赛签表标记
  - 赛后统计可用标记
- 处理 loading、error、empty 和 stale 状态。
- 支持 `VITE_API_BASE_URL` 指定后端地址，便于生产构建预览或静态部署。

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 创建本地环境变量：

```bash
cp .env.example .env.local
```

3. 在 `.env.local` 中填入：

```env
PANDASCORE_API_TOKEN=your_api_token_here
DEFAULT_TIMEZONE=Asia/Shanghai
CACHE_TTL_SECONDS=900
PANDASCORE_REQUEST_TIMEOUT_MS=8000
PANDASCORE_REQUEST_RETRY_COUNT=1
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

其中 `VITE_API_BASE_URL` 在本地开发时可以省略；`npm run dev` 会通过 Vite 代理访问后端。使用生产构建预览或静态部署时建议保留它。
`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 只用于服务端读取，前端不会直接访问 Supabase。

4. 启动开发服务：

```bash
npm run dev
```

访问：

- 前端：http://localhost:5173/
- 后端：http://localhost:3001/api/health

## 生产构建预览

先启动后端：

```bash
npm run dev:server
```

再构建并预览前端：

```bash
npm run build
npm run preview
```

## 验证命令

```bash
npm run typecheck
npm test
npm run build
```

## v0.7.0 说明

- 本次仅同步项目版本号至 `0.7.0`，功能基线仍延续 `v0.6.0` 的 Supabase 使用优化版。

## v0.6.0 说明

- Supabase 迁移文件位于 `supabase/migrations/20260526_create_match_cache_tables.sql`。
- Supabase 查询优化迁移位于 `supabase/migrations/20260527_optimize_match_cache_queries.sql`。
- 当前远程 Supabase 已执行并验证 v0.6.0 迁移，migration history 已与本地 `20260526`、`20260527` 对齐；`supabase/repair` 仅保留为本次手工修复记录。
- 数据表用途：
  - `matches`：持久化赛程主数据
  - `match_fetch_windows`：记录窗口同步状态、freshness 和过期信息
  - `sync_runs`：记录每次同步执行结果
- 缓存策略：
  - 完整响应继续使用服务端内存缓存
  - 历史已结束赛果使用 Supabase 窗口覆盖复用：只要碎片化的 finished 窗口能无断点覆盖请求日期范围，就直接读取 `matches` 表，不再请求 PandaScore
  - 如果覆盖不完整，只补缺失的日期段，不再整段回源
  - 新写入的 finished 窗口统一使用 `status_group = "finished"`，旧的 `schedule_finished` / `results_finished` 仍可作为兼容覆盖来源
  - 新补齐的 finished 窗口按天写入，便于未来任意范围复用
  - 源窗口使用 Supabase 持久化缓存，TTL 会按比赛状态分层
  - `refresh=1` 仍会强制整段回源 PandaScore
  - 同一源窗口并发请求通过 in-flight dedupe 合并
- 请求减少策略：
  - 后端优先命中 fresh window
  - 前端默认批量加载到本周最后一天
  - 滚动到周末后不再按天追加请求
- Supabase 优化：
  - 服务端 Supabase client 绑定项目 schema 类型
  - repository 使用统一 Supabase 访问边界
  - 查询使用显式字段投影，避免 `select("*")`
  - `matches` 批量写入按 100 条分片 upsert
  - 数据库新增贴合查询路径的复合索引和 `updated_at` trigger
- 验证方式：
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## 更新流程

后续更新必须按版本流程执行，不能直接散改。流程见 [docs/release-process.md](./docs/release-process.md)。
