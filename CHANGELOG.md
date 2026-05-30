# Changelog

本项目从 `0.1.0` 开始记录版本变更。后续每次功能、修复或数据结构调整都必须更新本文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号遵循轻量 SemVer。

## [0.7.0] - 2026-05-31

### Changed

- 项目版本号提升至 `0.7.0`，并同步更新 README、项目状态和发布流程文档。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。

## [0.6.0] - 2026-05-27

### Added

- 新增 Supabase `Database` schema 类型，并将服务端 client 改为 typed client。
- 新增 repository 共享 Supabase 访问 helper，统一 Supabase 未配置时的错误边界。
- 新增 Supabase 查询优化迁移，补充贴合 `matches`、`match_fetch_windows` 和 `sync_runs` 实际访问模式的索引。
- 新增数据库侧 `updated_at` trigger，自动维护 `matches` 和 `match_fetch_windows` 更新时间。
- 新增 v0.6.0 规划文档。

### Changed

- Supabase repository 查询从 `select("*")` 改为显式字段投影。
- `matches` 批量 upsert 改为按 100 条分片写入，降低单次 payload 与网络抖动风险。
- repository row/upsert 类型改为从 Supabase schema 类型派生。
- 项目版本号提升至 `0.6.0`。

### Fixed

- 修复 `match_fetch_windows.updated_at` 在 upsert 更新后可能不反映最新修改时间的问题。
- 整理 Supabase schema-not-ready 判断表达式，提升可读性并避免运算符优先级误读。
- 补充 Supabase 远程手工执行迁移后的 history repair 记录，并完成远程 migration history 对齐，避免 `db push` 因 history 不同步持续失败。
- 关闭 `supabase/config.toml` 默认 seed 开关，避免 `db reset` 因缺少 `supabase/seed.sql` 产生错误或噪音。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。

### Known Gaps

- Supabase 远程迁移已执行并验证，migration history 已与本地文件对齐。
- 尚未接入 Supabase 运行期指标或后台同步监控面板。
- 仍未加入浏览器自动化回归测试，复杂交互以本地人工点验为主。

## [0.5.0] - 2026-05-26

### Added

- 新增 Supabase 持久化赛程缓存表：`matches`、`match_fetch_windows`、`sync_runs`。
- 新增服务端 Supabase client 和 repository 层，用于持久化赛程、窗口状态和同步记录。
- 新增 in-flight dedupe，避免相同源窗口并发重复拉取 PandaScore。
- 新增源窗口 freshness 语义，支持 fresh 命中、stale fallback 和失败记录。
- 新增前端周维度批量加载策略，首屏和日期切换都会加载到本周最后一天。
- 新增 v0.5.0 规划文档。

### Changed

- `/api/matches` 的主流程接入 Supabase 持久化缓存，优先命中 fresh window，未命中时再回源 PandaScore。
- 完整响应缓存 key 升级为 `matches-response:v3`。
- 源窗口缓存 key 升级为 `source-window:v1`。
- 前端时间线从“按天追加”改为“按周批量加载”，减少重复请求。
- 项目版本号提升至 `0.5.0`。

### Fixed

- 修复重复窗口请求在高并发场景下可能重复打 PandaScore 的问题。
- 修复单游戏回源失败时无法记录同步结果的问题。
- 修复前端滚动追加在已加载到本周末后仍可能继续触发请求的问题。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。

### Known Gaps

- 目前仅完成赛程缓存和加载性能优化，尚未引入收藏、提醒、订阅或个性化排序。
- Supabase 远程迁移需要在部署环境中单独执行并验证。
- 仍未加入浏览器自动化回归测试，复杂交互以本地人工点验为主。

## [0.4.0] - 2026-05-25

### Added

- 新增赛事时间线浏览模式，列表按当前状态展示对应比赛。
- 新增滚动加载赛程：选择日期后以当天为起点，向下滚动扩展到本周最后一天。
- 新增时间线浏览边界：列表不再加载选中日前的日期，超出当前周需通过日期栏选择对应日期查看。
- 日期条展示选中日期所在自然周，左右按钮改为前一天/后一天切换，跨周时整排日期随之切换。
- 新增日期分组粘性标题，滚动时同步当前日期和顶部周日期条选中态。
- 新增进入列表时的智能定位：优先定位当天进行中比赛，其次定位即将开始比赛，最后定位最近结束比赛。

### Changed

- 默认查询从单日静态列表改为当天起始的时间线窗口，并在 URL 中同步当前已载入日期范围。
- 状态筛选简化为“进行中&未开始”和“已结束”两类；两种状态都从选中日期开始按时间正序展示到本周最后一天。
- “今日重点 / 当日重点”改为跟随当前可见日期，只展示该日期的重点赛事。
- 空状态文案改为时间线语境。
- 项目版本号提升至 `0.4.0`。

### Fixed

- 修复“全部赛事”只展示当天且不随滚动扩展的问题。
- 修复默认状态筛选语义不清的问题，避免进行中&未开始和已结束赛事混排。
- 修复顶部日期和赛事列表可见日期割裂的问题。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。

### Known Gaps

- 时间线滚动仍基于前端 IntersectionObserver，未做虚拟列表。
- 前端仍未加入浏览器自动化回归测试，滚动体验以本地人工点验为主。

## [0.3.0] - 2026-05-25

### Added

- 接入 Tailwind CSS，前端样式统一迁移到 utility-first 写法。
- 新增 shadcn/ui 风格基础组件：`Button`、`Card`、`Badge`、`Skeleton`。
- 新增 lucide-react 图标，用于筛选、状态、刷新、日期和比赛详情入口。
- 新增 framer-motion 轻量动效，覆盖筛选切换、列表出现、重点赛事和详情展开。
- 新增“个人观赛面板”首页布局，展示当前日期、载入比赛数和进行中比赛数。
- 新增“今日重点 / 当日重点”赛事区域，优先展示进行中和高等级赛事。
- 新增 LoL 和 VALORANT 固定 B 站直播链接覆盖。

### Changed

- 重构筛选区为按游戏、赛区、赛事级别和状态排列的 Tabs/segmented controls。
- 重构赛事卡片，优化时间、赛事信息、队伍比分、胜者、标签和详情层级。
- 重构 Loading、Empty、Error 状态，使用 Skeleton 和更清晰的反馈面板。
- 重构全局样式，移除旧版大块玻璃拟态 CSS，页面视觉改为更干净的浅色面板风格。
- 优化移动端布局，日期条、筛选区、赛事卡片和详情区域保持单列可读。

### Fixed

- 修复赛事级别多选时 Framer shared layout `layoutId` 重复的问题。
- 修复“今日重点”在非今天日期仍显示今日文案的问题。
- 修复重点赛事 S/A 级判断大小写不一致导致排序失效的问题。
- 修复服务端 mock 直播链接使用未定义变量导致生产构建失败的问题。
- 修复筛选区“赛区”和“状态”列对齐不一致的问题。

### Verified

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- 完成 v0.3.0 轻量 UI/UX review 和验收。

### Known Gaps

- 前端仍未加入浏览器自动化回归测试，视觉验收以本地人工点验为主。
- 本版本聚焦 UI 重构，未加入收藏、提醒、日历订阅和个性化排序。
- 固定直播链接为个人使用场景优化，后续如需多平台可再抽成配置。

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
