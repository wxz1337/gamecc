# Esports Schedule Aggregator

个人使用的电竞赛程聚合工具，用于集中查看 CS2、VALORANT 和英雄联盟赛程。第一版基于 React + Vite + Express + TypeScript，并通过后端代理访问 PandaScore API。

## 当前版本

- 版本：`0.2.0`
- 状态：MVP 第一版可用，工程化收口中
- 运行方式：本地开发服务
- 数据源：PandaScore API

详细状态见 [docs/project-status.md](./docs/project-status.md)。

## 已实现能力

- 默认展示北京时间当天赛程。
- 支持今天、明天切换。
- 支持全部、CS2、VALORANT、LoL 筛选。
- 通过后端代理请求 PandaScore，前端不暴露 token。
- 支持内存缓存、手动刷新和 stale 兜底。
- 展示比赛时间、项目、赛事、队伍、状态和 BO 赛制。
- 展示 PandaScore 免费接口可用的扩展信息：
  - 队伍 logo、缩写、地区
  - 比分、胜者
  - 结束时间、原定时间、重赛标记
  - 单局摘要、局时长、单局胜者
  - 赛事国家、赛区、等级、奖金池、淘汰赛签表标记
  - 赛后统计可用标记
- 处理 loading、error、empty 和 stale 状态。
- 支持生产构建。
- API 集成测试覆盖健康检查、参数透传和校验错误。
- 前端人工验收清单见 [docs/frontend-acceptance-checklist.md](./docs/frontend-acceptance-checklist.md)。

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 创建本地环境变量：

```bash
cp .env.example .env.local
```

3. 在 `.env.local` 中填入：

```env
PANDASCORE_API_TOKEN=your_api_token_here
DEFAULT_TIMEZONE=Asia/Shanghai
CACHE_TTL_SECONDS=900
PANDASCORE_REQUEST_TIMEOUT_MS=8000
PORT=3001
```

4. 启动开发服务：

```bash
npm run dev
```

访问：

- 前端：http://localhost:5173/
- 后端：http://localhost:3001/api/health

## 验证命令

```bash
npm test
npm run build
```

## 更新流程

后续更新必须按版本流程执行，不能直接散改。流程见 [docs/release-process.md](./docs/release-process.md)。
