# Project Status

更新时间：2026-05-24

## 总体判断

当前项目作为第一版 MVP 已经可用。它能本地启动、获取真实 PandaScore 数据、聚合三类游戏赛程，并展示免费 token 可提供的大部分赛程与赛果信息。

从工程现实角度看：

- 第一版可用性：完成
- 可维护产品雏形：约 80%-85%
- 后续重点：流程化迭代、测试补强、组件拆分、部署准备

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

### 后端

- Express API 服务。
- `/api/health` 健康检查。
- `/api/matches?date=YYYY-MM-DD&game=all|cs2|valorant|lol&refresh=1` 赛程接口。
- 参数校验和统一错误响应。
- PandaScore token 只在服务端读取。
- 内存缓存支持 fresh cache、expired cache 和 stale fallback。
- `refresh=1` 会跳过 fresh cache。

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

- 测试通过：4 个测试文件，9 个用例
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

- 没有 Git 仓库记录，当前无法通过 commit/tag 管理版本。
- `.env.local` 本地存在真实 token，必须继续保持忽略。
- token 已在对话中出现，长期使用建议轮换。
- API 集成测试缺失，错误路径和真实字段变化风险仍需补强。
- 前端缺少自动化交互测试和移动端截图验收。
- `src/App.tsx` 组件偏集中，后续功能增加前应拆分。

## 建议下一步

1. 初始化 Git 仓库，建立 `main` 分支和版本 tag。
2. 按 [release-process.md](./release-process.md) 执行后续更新。
3. 补 API 集成测试。
4. 拆分前端组件。
5. 补移动端和桌面端截图验收记录。
6. 轮换 PandaScore token。

