# Changelog

本项目从 `0.1.0` 开始记录版本变更。后续每次功能、修复或数据结构调整都必须更新本文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号遵循轻量 SemVer。

## [0.2.0] - 2026-05-25

### Added

- 新增本周七天快捷选择、上一周/下一周切换和自定义日期选择器。
- 新增全部、LoL、CS2、VALORANT 游戏筛选。
- 新增随游戏变化的赛区筛选、PandaScore 赛事级别筛选和比赛状态筛选。
- 新增比赛详情展开，展示 BO、比分、胜者、状态、数据来源、更新时间和小局摘要。
- 新增 URL 状态同步，刷新页面后保留当前筛选条件。
- 新增 `/api/matches` 0.2.0 查询响应字段：`from`、`to`、`filters`、`sort`、`total`、`facets`。
- 新增 `VITE_API_BASE_URL`，支持生产构建预览或静态部署时指定后端地址。
- 新增后端 API 集成测试和范围筛选业务测试。

### Changed

- PandaScore 拉取从单页扩展为分页获取，降低 100 条分页上限导致的数据截断风险。
- 扩展 `Match` 共享模型，补充 `serie`、`stage`、`replayUrl`、`source`、`updatedAt` 等详情字段。
- 前端从“今天/明天列表”升级为按日期、游戏、赛区、级别和状态查看的轻量赛事查询工具。
- 项目版本号提升至 `0.2.0`。

### Fixed

- 延期、取消和 delayed 状态统一映射为明确状态，不再混入普通未开始比赛。
- 修复生产构建预览时前端只能请求同源 `/api` 的部署踩坑点。
- 详情状态展示改为中文文案。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- 完成轻量桌面/移动端人工验收清单，见 [docs/frontend-acceptance-checklist.md](./docs/frontend-acceptance-checklist.md)。
- 2026-05-25 完成轻量整体 review，未发现阻断启动、核心查询崩溃或重大筛选逻辑错误。

### Known Gaps

- 仍未加入收藏、提醒、日历订阅和多数据源融合。
- 前端没有引入浏览器自动化回归测试，个人使用场景下以手动验收为主。
- 真实 PandaScore 字段质量仍取决于免费接口返回内容。

## [0.1.0] - 2026-05-24

### Added

- 建立 React + Vite + Express + TypeScript 项目骨架。
- 实现 `/api/health` 和 `/api/matches`。
- 接入 PandaScore API token，并通过后端代理访问数据源。
- 实现 CS2、VALORANT、LoL 三类游戏赛程聚合。
- 实现北京时间日期范围计算和北京时间展示。
- 实现游戏筛选、今天/明天切换、刷新按钮。
- 实现内存缓存、TTL、手动刷新跳过 fresh cache、stale 兜底。
- 实现 PandaScore 原始数据到内部 `Match` 模型映射。
- 展示比赛基础信息：时间、游戏、赛事、队伍、状态、BO 赛制。
- 展示 PandaScore 免费接口可用的扩展信息：比分、胜者、队伍 logo、队伍地区、结束时间、原定时间、重赛标记、单局摘要、赛事国家/赛区/等级/奖金池/签表标记、赛后统计可用标记。
- 实现 loading、error、empty、stale UI 状态。
- 增加基础单元测试：日期工具、参数校验、缓存服务、PandaScore mapper。

### Fixed

- 修复 Vite 构建时 `import.meta.env` 类型缺失问题。
- 修复手动刷新未绕过 fresh cache 的问题。
- 后端启动时加载 `.env.local`，便于本地 token 配置。

### Verified

- `npm test` 通过。
- `npm run build` 通过。
- 使用真实 PandaScore token 验证 2026-05-24 数据：
  - CS2：48 场
  - VALORANT：12 场
  - LoL：8 场
  - 聚合 `game=all`：68 场

### Known Gaps

- 缺少 API 集成测试。
- 缺少前端自动化交互测试。
- 缺少正式部署方案。
- 组件仍主要集中在 `src/App.tsx`，后续扩展前应拆分。
- PandaScore token 曾在对话中出现，长期使用建议轮换。
