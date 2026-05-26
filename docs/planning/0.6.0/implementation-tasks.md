# v0.6.0 Implementation Tasks

## Supabase Code Boundary

- [x] 新增 Supabase `Database` 类型。
- [x] 将服务端 Supabase client 改为 `createClient<Database>()`。
- [x] 抽取 repository 共享 `getSupabaseOrThrow`。
- [x] 移除 repository 内重复的 Supabase 未配置处理。

## Query And Write Optimization

- [x] 将 `matches` 查询改为显式字段投影。
- [x] 将 `match_fetch_windows` 查询和 upsert 返回改为显式字段投影。
- [x] 将 `sync_runs` insert/update 返回改为显式字段投影。
- [x] 为 `matches` 批量 upsert 增加分片写入。
- [x] 增加分片写入单元测试。

## Database Migration

- [x] 新增匹配 `/api/matches` 查询模式的复合索引。
- [x] 新增窗口 freshness 查询索引。
- [x] 新增同步记录最近记录索引。
- [x] 新增 `updated_at` trigger。

## Release

- [x] 升级项目版本号到 `0.6.0`。
- [x] 更新 README。
- [x] 更新 CHANGELOG。
- [x] 更新项目状态文档。
- [x] 运行 `npm run typecheck`。
- [x] 运行 `npm test`。
- [x] 运行 `npm run build`。
