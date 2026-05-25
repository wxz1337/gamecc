# v0.5.0 规划

## 目标

v0.5.0 的目标是把赛程缓存从“仅内存”升级为“Supabase 持久化缓存 + 服务端内存缓存 + 请求合并 + 前端批量加载”的组合方案，在保持 `/api/matches` 响应结构兼容的前提下，显著减少 PandaScore API 调用次数并提升首屏与滚动加载速度。

## 范围

- 后端引入 Supabase 持久化表，用于保存比赛数据、窗口同步状态和同步记录。
- 后端增加 repository 层，隔离数据库读写。
- 后端增加 in-flight dedupe，避免同一窗口的并发重复拉取。
- 后端在 `getMatches` 中接入 Supabase cache first / PandaScore fallback 的流程。
- 前端把时间线加载改为按周批量拉取，减少每次滚动 1 天游标式请求。
- 更新文档、版本号和发布说明。

## 核心原则

- 前端不直接访问 Supabase。
- 不暴露 Supabase service role 到前端。
- `/api/matches` 的响应结构保持兼容。
- Supabase 未配置时，系统必须继续使用现有 PandaScore + 内存缓存路径。
- 分阶段推进，每阶段都可独立验证和回滚。

## 交付物

- 数据表：
  - `matches`
  - `match_fetch_windows`
  - `sync_runs`
- 服务端基础设施：
  - Supabase client
  - repository 层
  - in-flight dedupe
- 业务改造：
  - `getMatches` 接入持久化缓存
  - 前端批量加载优化
- 文档：
  - 设计说明
  - 任务清单
  - 发布说明

## 验收标准

- `game=all` 场景能够并发读取多个游戏窗口，并在失败时保留 partial/warnings 语义。
- fresh window 命中时不会重复调用 PandaScore。
- stale/missing window 可触发回源并更新 Supabase。
- `refresh=1` 可以跳过 fresh 命中并强制刷新。
- 前端首屏和滚动加载不再按 1 天游标式持续追加请求。
- Supabase 未配置时系统仍可正常运行。

