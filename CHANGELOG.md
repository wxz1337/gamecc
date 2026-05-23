# Changelog

本项目从 `0.1.0` 开始记录版本变更。后续每次功能、修复或数据结构调整都必须更新本文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号遵循轻量 SemVer。

## [0.2.0] - 2026-05-24

### Added

- 初始化 Git 仓库，建立 `main` 分支，并为 0.1.0 基线打 `v0.1.0` 标签。
- 新增 API 集成测试，覆盖健康检查、赛程查询参数透传和日期校验错误。
- 新增前端验收清单，覆盖桌面端、移动端、数据源和发布前记录。

### Changed

- 将 Express app 创建逻辑从服务启动文件中拆出，便于测试复用。
- 拆分 `src/App.tsx`，将比赛卡片、列表、状态面板、常量和格式化逻辑拆入独立模块。
- 项目版本号提升至 `0.2.0`。

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
