# Project Status

更新时间：2026-05-31

## 总体判断

当前项目已完成 `0.7.0` 版本标记更新，并继续沿用 `0.6.0` Supabase 使用优化基线。它在 `0.5.0` 持久化缓存基础上，补强了 Supabase 类型边界、查询字段投影、批量写入稳定性、数据库索引和更新时间维护。

从当前定位看：

- 个人使用可用性：完成
- `0.7.0` 版本标记：完成
- 重大 bug 风险：未发现
- 后续重点：规划收藏关注、提醒、日历订阅或个人偏好排序
- 后续重点：观察 Supabase freshness、写入与查询表现，必要时细化同步监控

## 当前能力

### 前端

- 单页 React 应用。
- 使用 Tailwind CSS 统一样式。
- 使用 shadcn/ui 风格基础组件承载按钮、卡片、标签和骨架屏。
- 使用 lucide-react 展示状态、日期、刷新和详情图标。
- 使用 framer-motion 提供 Tabs、列表、重点赛事和详情展开的轻量动效。
- 首页已重构为个人观赛面板，包含当前日期、已载入场次、进行中场次和重点赛事。
- 默认定位北京时间当天赛程。
- 按当前状态展示对应时间线比赛。
- 选择日期后以当天为时间线起点，向下滚动加载到本周最后一天。
- 时间线不加载选中日前的日期，超出当前周需通过日期栏选择对应日期查看，避免无限扩张。
- 支持自然周日期条、前一天/后一天切换和自定义日期选择。
- 支持全部、LoL、CS2、VALORANT 游戏筛选。
- 支持随游戏变化的赛区筛选。
- 支持 PandaScore 赛事级别筛选：全部、S、A、B、C。
- 状态筛选简化为进行中&未开始、已结束两类；两种状态都从选中日期开始按时间正序展示到本周最后一天。
- 支持比赛详情展开，展示 BO、比分、胜者、状态、来源、更新时间和小局摘要。
- URL 会同步筛选条件，刷新页面后恢复当前查询。
- 展示 loading、error、empty、stale 和 mock 数据提示。
- Loading 使用 Skeleton，Empty/Error 状态使用清晰反馈面板。
- 响应式布局已按 v0.4.0 时间线赛程目标完成。
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
- 支持 Supabase 持久化缓存：
  - `matches`
  - `match_fetch_windows`
  - `sync_runs`
- 支持源窗口 freshness 检查、in-flight dedupe 和 stale fallback。
- Supabase client 已绑定服务端 schema 类型。
- Supabase repository 使用显式字段投影，避免 `select("*")`。
- `matches` 批量 upsert 已按固定大小分片。

### 数据与缓存

- 响应级缓存 key 使用 `matches-response:v3`。
- 源窗口 key 使用 `source-window:v1`。
- Supabase 未配置时自动回退到现有 PandaScore + 内存缓存路径。
- 前端批量加载将首屏和日期切换请求范围扩展到本周最后一天，降低按天请求次数。
- Supabase 迁移已补充贴合查询路径的复合索引，并由数据库 trigger 自动维护缓存表 `updated_at`。

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
- 测试通过：包含 API 集成、日期工具、参数校验、缓存服务、PandaScore mapper、Supabase repository、in-flight dedupe、timeline helper 和范围筛选业务测试。
- 生产构建通过。
- 轻量人工验收清单见 [frontend-acceptance-checklist.md](./frontend-acceptance-checklist.md)。
- v0.7.0 版本标记已通过类型检查、测试和生产构建。

## 已知取舍

- 未做用户系统、收藏、提醒、日历订阅、多数据源融合和个性化排序。
- 未做前端浏览器自动化回归测试，个人使用场景下以手动点验为主。
- PandaScore 免费接口字段偶尔不完整，页面以可选字段方式展示。
- Supabase 依赖需要在部署环境中正确配置服务端环境变量。
- v0.6.0 Supabase 索引与 trigger 迁移已执行并验证，remote migration history 已与本地 `20260526`、`20260527` 对齐。
- `.env.local` 本地存在真实 token 时必须继续保持忽略。

## 建议下一步

1. 保留当前状态作为 `0.7.0` 基线。
2. 用真实 PandaScore token 持续点验几个常用筛选组合。
3. 在手机宽度下看一遍日期切换、筛选、详情展开。
4. 继续观察 Supabase freshness、写入和查询表现，必要时增加同步监控。
