# Project Status

更新时间：2026-05-25

## 总体判断

当前项目已完成 `0.3.0` UI 重构。它保留 `0.2.0` 的查询、筛选、URL 同步和 API 结构，前端升级为更适合日常查看赛事的个人观赛面板。

从当前定位看：

- 个人使用可用性：完成
- `0.3.0` UI 重构目标：完成
- 重大 bug 风险：未发现
- 后续重点：规划收藏关注、提醒、日历订阅或个人偏好排序

## 当前能力

### 前端

- 单页 React 应用。
- 使用 Tailwind CSS 统一样式。
- 使用 shadcn/ui 风格基础组件承载按钮、卡片、标签和骨架屏。
- 使用 lucide-react 展示状态、日期、刷新和详情图标。
- 使用 framer-motion 提供 Tabs、列表、重点赛事和详情展开的轻量动效。
- 首页已重构为个人观赛面板，包含当前日期、已载入场次、进行中场次和重点赛事。
- 默认展示北京时间当天比赛。
- 支持本周七天快捷项、上一周/下一周切换和自定义日期选择。
- 支持全部、LoL、CS2、VALORANT 游戏筛选。
- 支持随游戏变化的赛区筛选。
- 支持 PandaScore 赛事级别筛选：全部、S、A、B、C。
- 支持全部比赛、未开始、进行中、已结束状态筛选。
- 支持比赛详情展开，展示 BO、比分、胜者、状态、来源、更新时间和小局摘要。
- URL 会同步筛选条件，刷新页面后恢复当前查询。
- 展示 loading、error、empty、stale 和 mock 数据提示。
- Loading 使用 Skeleton，Empty/Error 状态使用清晰反馈面板。
- 响应式布局已按 v0.3.0 UI 重构目标完成。
- 支持 `VITE_API_BASE_URL` 指定后端地址，便于生产构建预览或静态部署。

### 后端

- Express API 服务。
- `/api/health` 健康检查。
- `/api/matches` 支持 0.2.0 查询参数：
  - `from` / `to`
  - `date`
  - `view`
  - `game`
  - `status`
  - `tier`
  - `query`
  - `league`
  - `team`
  - `region`
  - `stage`
  - `sort`
  - `refresh=1`
- 兼容旧的单日查询方式。
- 参数校验和统一错误响应。
- PandaScore token 只在服务端读取。
- 支持分页获取 PandaScore 数据。
- 内存缓存支持 fresh cache、expired cache 和 stale fallback。

### 数据

当前已使用 PandaScore 免费 token 可用能力：

- 赛程时间
- 比赛状态
- 队伍信息
- 队伍 logo
- 队伍地区
- BO 赛制
- 比分
- 胜者
- 结束时间
- 原定时间和重赛标记
- 单局摘要
- 赛事国家、赛区、等级、奖金池、签表标记
- 赛后统计可用标记
- 直播和回放链接字段可用时展示
- LoL 和 VALORANT 会覆盖为个人常用 B 站直播链接

## 验证记录

最近一次验证：

```bash
npm run typecheck
npm test
npm run build
```

结果：

- 类型检查通过。
- 测试通过：包含 API 集成、日期工具、参数校验、缓存服务、PandaScore mapper 和范围筛选业务测试。
- 生产构建通过。
- 轻量人工验收清单见 [frontend-acceptance-checklist.md](./frontend-acceptance-checklist.md)。
- v0.3.0 轻量整体 review 已完成，发现的问题已修复，未发现会影响个人使用的重大 bug。

## 已知取舍

- 未做用户系统、收藏、提醒、日历订阅、多数据源融合和个性化排序。
- 未做前端浏览器自动化回归测试，个人使用场景下以手动点验为主。
- PandaScore 免费接口字段偶尔不完整，页面以可选字段方式展示。
- 内存缓存适合当前本地/个人使用，暂未升级到持久化缓存。
- `.env.local` 本地存在真实 token 时必须继续保持忽略。

## 建议下一步

1. 保留当前状态作为 `0.3.0` 基线。
2. 用真实 PandaScore token 持续点验几个常用筛选组合。
3. 在手机宽度下看一遍日期切换、筛选、详情展开。
4. 进入 `0.4.0` 规划：收藏关注、提醒、日历订阅或个人偏好排序。
