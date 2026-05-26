# v0.6.0 规划

## 目标

v0.6.0 聚焦优化 Supabase 在项目中的使用方式：在保持 `/api/matches` 响应兼容、前端不直连 Supabase 的前提下，降低数据库读写负担、提升写入稳定性，并让仓储层类型和边界更清晰。

## 范围

- 为 Supabase client 增加服务端 schema 类型。
- 抽取 repository 共享的 Supabase client 获取逻辑。
- 将 Supabase 查询从 `select("*")` 改为显式字段投影。
- 为 `matches` 批量 upsert 增加分片写入。
- 增加贴合当前查询路径的 Supabase 索引迁移。
- 在数据库侧自动维护 `updated_at`，提升缓存窗口和赛程记录的可观测性。
- 更新版本号、发布说明和项目状态。

## 非目标

- 不改变前端访问方式，前端仍只访问本项目后端。
- 不新增用户系统、收藏、提醒或订阅能力。
- 不改变 PandaScore 拉取策略和 `/api/matches` 响应结构。

## 验收标准

- Supabase 未配置时仍能走 PandaScore + 内存缓存路径。
- fresh window 命中、回源写入、stale fallback 语义保持不变。
- 类型检查、单元测试和生产构建通过。
- 新增迁移可在已有 v0.5.0 表结构上重复安全执行。
