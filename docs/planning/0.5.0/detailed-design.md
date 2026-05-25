# v0.5.0 Detailed Design

## 1. 背景

当前版本的缓存只存在于服务端内存中，进程重启后会失效，多实例部署时也无法共享；同时前端时间线按 1 天游标式追加加载，导致相同时间窗口在不同筛选下会产生较多重复请求。v0.5.0 要解决的是“重复抓取”和“重复加载”两个层面的问题。

## 2. 目标

- 降低 PandaScore API 调用次数。
- 缩短同类查询的响应时间。
- 保持 API 兼容性和错误语义。
- 让缓存策略从“页面级”扩展到“源窗口级”。

## 3. 总体架构

### 3.1 数据流

1. 前端请求 `/api/matches`。
2. 后端先查完整响应内存缓存。
3. 如果未命中或需要刷新，后端按游戏拆分成一个或多个 source window。
4. 后端检查 `match_fetch_windows`：
   - fresh：直接从 `matches` 读取。
   - stale/missing/refresh：通过 in-flight dedupe 统一回源 PandaScore。
5. 回源成功后：
   - upsert `matches`
   - 更新 `match_fetch_windows`
   - 记录 `sync_runs`
6. 将数据映射、过滤、排序、聚合后返回 `/api/matches` 响应。
7. 如果响应可缓存，再写回内存响应缓存。

### 3.2 分层职责

- `matchService.ts`
  - 组装业务流程
  - 保持响应兼容
  - 处理 fresh/stale/fallback 语义
- repository 层
  - 只负责数据库读写与 row <-> domain mapping
- cache/in-flight 层
  - 只负责内存缓存和请求合并

## 4. 数据表设计

### 4.1 `matches`

用途：持久化比赛实体，作为窗口缓存的主数据表。

关键约束：

- `unique (source, game, provider_match_id)`
- 索引覆盖常见查询维度：
  - `(game, display_date)`
  - `(game, begin_at)`
  - `(status, begin_at)`
  - `(tournament_tier)`
  - `(tournament_region)`

字段策略：

- 结构化字段用于查询和筛选。
- `teams` / `score` / `games` / `raw_payload` 使用 JSONB 保留扩展能力。
- `provider_updated_at` 用于判断上游变更。

### 4.2 `match_fetch_windows`

用途：记录某个 `source + game + date range + status_group` 的同步结果和过期时间。

关键语义：

- `last_synced_at` 代表最近一次成功同步时间。
- `expires_at` 代表窗口 freshness 边界。
- `last_error_*` 记录最近一次同步失败原因。

### 4.3 `sync_runs`

用途：审计单次同步执行情况，便于排查 PandaScore、窗口覆盖和 upsert 量。

字段语义：

- `started_at` / `finished_at` 记录同步生命周期。
- `success` 表示本次同步是否成功完成。
- `fetched_count` / `upserted_count` 提供运行统计。

## 5. 缓存 Key 设计

### 5.1 响应缓存 key

用于完整 `/api/matches` 响应内存缓存。

格式：

`matches-response:v3:{from}:{to}:{view}:{game}:{status}:{tier}:{region}:{sort}:{query}:{league}:{team}:{stage}`

说明：

- 这是“页面级结果缓存”。
- 保留所有会影响最终列表和 facets 的业务筛选维度。
- 目标是复用同一查询结果，避免前端短时间内重复请求。

### 5.2 源窗口 key

用于 Supabase 的窗口缓存语义和 in-flight dedupe。

格式：

`source-window:v1:{game}:{from}:{to}:{status_group}`

说明：

- 不包含 `tier / region / sort / query / league / team / stage`。
- 同一源窗口应服务多个前端筛选组合。
- 这个 key 代表“拉取上游数据的最小稳定单位”。

### 5.3 status_group

建议分组：

- `all`
- `schedule_running`
- `schedule_finished`
- `results_running`
- `results_finished`

实际实现可根据当前查询语义合并为更少的分组，只要能够区分 PandaScore 拉取策略和窗口 freshness 即可。

## 6. In-flight Dedupe 设计

### 6.1 目标

同一个源窗口在并发请求到达时，只允许一个 factory 真正执行，其他请求共享同一个 Promise。

### 6.2 规则

- 相同 key 的并发请求复用同一 Promise。
- 成功时清理 key。
- 失败时也必须清理 key，避免永远卡住。
- dedupe 只覆盖源窗口回源，不影响不同窗口或不同业务查询。

### 6.3 预期收益

- 减少短时间内的重复 PandaScore 拉取。
- 降低滚动加载和刷新之间的竞态放大。
- 在 `game=all` 场景下更好地保护上游配额。

## 7. 前端批量加载设计

### 7.1 现状问题

当前前端按“1 天增量”加载，滚动到底部时会反复请求相邻日期，导致网络请求较碎、UI 更新频繁、URL 同步次数偏多。

### 7.2 新策略

- 首屏请求范围改为“选中日期到本周最后一天”。
- 切换日期后，仍请求“当前选中日期到本周最后一天”。
- 如果首屏已加载到本周末，不再触发每日 append。
- 保留现有时间线展示和 URL 同步逻辑。

### 7.3 目标效果

- 让每次筛选变更尽量只触发一次批量请求。
- 让滚动更多地变成“浏览本地已加载内容”，而不是持续发请求。

## 8. 风险与回滚

### 8.1 风险

- 数据映射不一致，导致前端字段缺失。
- 窗口 freshness 判断过严或过松，影响数据新鲜度或请求量。
- `game=all` partial 语义被破坏。
- 前端批量加载导致 URL 和列表可见范围不一致。

### 8.2 回滚

- 保留现有 PandaScore + 内存缓存路径。
- Supabase client 未配置时直接跳过 repository 路径。
- 若阶段 5 或阶段 6 有问题，可快速回退到前一阶段的逻辑，不需要删除数据库表。

