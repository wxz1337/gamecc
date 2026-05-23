# Frontend Acceptance Checklist

更新时间：2026-05-24

这份清单用于每次前端改动后的人工验收，覆盖当前 MVP 的核心交互、状态和响应式表现。

## 启动前检查

- 执行 `npm test`，确认单元测试和 API 集成测试通过。
- 执行 `npm run build`，确认 TypeScript 和生产构建通过。
- 执行 `npm run dev`，确认前端 `http://localhost:5173/` 和后端 `http://localhost:3001/api/health` 可访问。
- 确认 `.env.local` 存在且未被 Git 跟踪。

## 桌面端验收

- 视口：1440 x 900。
- 首屏应展示标题、当前日期、刷新按钮、日期筛选、游戏筛选和赛程列表区域。
- 点击“今天”和“明天”后，当前日期卡片、列表内容和选中态应同步更新。
- 依次点击“全部 / CS2 / VALORANT / LoL”，列表应按项目切换，按钮选中态应明确。
- 点击“刷新”时按钮应进入禁用态，请求完成后恢复可点击。
- 比赛卡片应稳定展示时间、日期、项目、状态、赛事、队伍、比分和可用扩展信息。
- 队伍名称、赛事名称、meta 标签和比分不应互相重叠或溢出容器。
- 当后端返回 stale 数据时，应显示缓存提示 banner。
- 当接口失败时，应显示错误面板和可用的“重试”按钮。
- 当列表为空时，应显示空状态文案。

## 移动端验收

- 视口：390 x 844。
- 页面不应出现横向滚动。
- 顶部 hero、控制区、状态 banner、赛程卡片和页脚应保持清晰间距。
- 日期和游戏筛选按钮应可点击，长标签不应挤出按钮。
- 比赛卡片里的队伍、比分和 meta 标签应换行合理，不遮挡后续内容。
- 刷新、重试按钮的可点击区域应清晰。

## 数据源验收

- 未配置 `PANDASCORE_API_TOKEN` 时，前端应显示本地 mock 数据提示。
- 配置真实 token 后，前端应显示实时赛程提示。
- `/api/matches?date=YYYY-MM-DD&game=all` 应返回聚合数据。
- `/api/matches?date=YYYY-MM-DD&game=cs2|valorant|lol` 应返回对应项目数据。
- `/api/matches?date=bad-date` 应返回 `INVALID_DATE` 错误。
- `/api/matches?date=YYYY-MM-DD&game=bad-game` 应返回 `INVALID_GAME` 错误。

## 发布前记录

- 记录本次验收日期、视口和浏览器。
- 若使用真实 token 验证，记录日期、项目和返回场次数。
- 若发现 UI 问题，先记录复现路径，再决定是否阻断发布。
