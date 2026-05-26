# v0.6.0 Detailed Design

## 背景

v0.5.0 已完成 Supabase 持久化缓存接入，但 repository 层仍存在几个可优化点：

- Supabase client 没有绑定项目 schema 类型，表字段变更时不容易在编译期暴露问题。
- 多个 repository 重复实现 `getSupabaseOrThrow`。
- 读路径使用 `select("*")`，字段传输范围不够明确。
- `matches` 写入一次性 upsert 全量数组，后续范围扩大时更容易遇到 payload 或网络抖动。
- 数据库索引更多是基础索引，还没有完全贴合 `source + game + date/status` 的真实查询模式。
- `match_fetch_windows.updated_at` 依赖默认值，upsert 更新后不一定能反映最新修改时间。

## 设计

### Typed Supabase Client

新增 `server/types/supabase.ts`，用项目当前三张表定义 `Database` 类型，并将 `createClient<Database>()` 应用于服务端 Supabase client。repository 内的 row/upsert 类型改为从 `Database` 派生。

### Repository Boundary

新增 `server/repositories/supabaseRepository.ts`，集中处理 Supabase 未配置时的错误抛出。业务 repository 只关心具体表操作。

### Explicit Projection

`matches`、`match_fetch_windows`、`sync_runs` 读写后返回数据时统一使用显式 select columns，减少不必要字段传输，也让字段依赖在代码中更直观。

### Bounded Upsert

`upsertMatches` 将 rows 按固定大小分片写入。当前默认 chunk size 为 100，适合现有周维度窗口，同时给后续扩大范围留下余地。

### Supabase Migration

新增 `20260527_optimize_match_cache_queries.sql`：

- 增加 `matches` 针对 `source/display_date/begin_at`、`source/game/display_date/begin_at`、`source/game/status/display_date/begin_at` 的索引。
- 增加 `match_fetch_windows` freshness lookup 索引。
- 增加 `sync_runs` 最近同步记录索引。
- 增加专用 `set_match_cache_updated_at()` trigger，维护 `matches` 与 `match_fetch_windows` 的 `updated_at`。

## 回滚

如新索引带来写入压力，可单独 drop v0.6.0 新增索引；代码层面的 typed client、显式字段选择和分片写入不改变 API 行为，回滚风险较低。
