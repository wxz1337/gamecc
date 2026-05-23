# Project Status

更新时间：2026-05-24

## 总体判断

当前项目作为第一版 MVP 已经可用。它能本地启动、获取真实 PandaScore 数据、聚合三类游戏赛程，并展示免费 token 可提供的大部分赛程与赛果信息。

从工程现实角度看：

- 第一版可用性：完成
- 可维护产品雏形：约 85%-90%
- 后续重点：前端自动化验收、部署准备、token 轮换

## 当前能力

### 前端

- 单页 React 应用。
- 默认展示北京时间当天赛程。
- 支持今天、明天切换。
- 支持全部、CS2、VALORANT、LoL 筛选。
- 支持手动刷新。
- 展示 loading、error、empty、stale 状态。
- 展示比赛基础信息和扩展赛果信息。
- 响应式布局已具备基础可用性。
- 核心展示组件已从 `App.tsx` 拆出，后续扩展更容易定位。

### 后端

- Express API 服务。
- `/api/health` 健康检查。
- `/api/matches?date=YYYY-MM-DD&game=all|cs2|valorant|lol&refresh=1` 赛程接口。
- 参数校验和统一错误响应。
- PandaScore token 只在服务端读取。
- 内存缓存支持 fresh cache、expired cache 和 stale fallback。
- `refresh=1` 会跳过 fresh cache。
- Express app 创建逻辑已拆出，可在测试中直接启动临时端口。

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

不包含：

- 直播流链接展示
- 实时局内事件
- 选手级详细数据
- 击杀、经济、地图事件等高级实时数据

## 验证记录

最近一次验证：

```bash
npm test
npm run build
```

结果：

- 测试通过：包含 API 集成测试、日期工具、参数校验、缓存服务、PandaScore mapper
- 生产构建通过
- 真实 PandaScore 聚合烟测通过

真实数据样本：

- 日期：2026-05-24
- 聚合数量：68 场
- 样本：`VKS vs LOS`
- 比分：`0:3`
- 胜者：`LOS`
- 单局数量：3
- 国家：`BR`
- 奖金池：`60,000 United States Dollar`

## 已知风险

- `.env.local` 本地存在真实 token，必须继续保持忽略。
- token 已在对话中出现，长期使用建议轮换。
- 前端缺少自动化交互测试和移动端截图验收。
- 正式部署方案尚未建立。

## 建议下一步

1. 按 [frontend-acceptance-checklist.md](./frontend-acceptance-checklist.md) 补移动端和桌面端截图验收记录。
2. 轮换 PandaScore token。
3. 规划正式部署方案。
4. 后续更新继续按 [release-process.md](./release-process.md) 执行。
