# v0.5.0 Implementation Tasks

## 阶段 1

- [x] 完成规划文档。

## 阶段 2

- [ ] 创建 Supabase migration。
- [ ] 更新 `.env.example`。
- [ ] 不接入主业务流程。

## 阶段 3

- [ ] 新增 `supabaseClient.ts`。
- [ ] 新增 repository 层。
- [ ] 增加 repository 纯函数和基础测试。

## 阶段 4

- [ ] 扩展缓存 key 设计。
- [ ] 新增 in-flight dedupe 工具。
- [ ] 增加相关测试。

## 阶段 5

- [ ] 改造 `getMatches`。
- [ ] 接入 Supabase fresh/stale/fallback。
- [ ] 补齐成功与失败路径测试。

## 阶段 6

- [ ] 调整前端首屏加载范围。
- [ ] 调整滚动追加策略。
- [ ] 保持 URL 同步和时间线展示兼容。

## 阶段 7

- [ ] 更新版本号。
- [ ] 更新 README / project status / changelog。
- [ ] 做最终验收。

## 验收检查清单

- [ ] `/api/matches` 响应结构兼容。
- [ ] Supabase 未配置时系统仍可运行。
- [ ] fresh window 不重复拉取 PandaScore。
- [ ] stale/missing window 可回源并更新数据库。
- [ ] `refresh=1` 可强制刷新。
- [ ] 前端不再按 1 天游标式持续加载到本周末。

