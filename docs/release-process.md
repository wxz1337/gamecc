# Release Process

后续更新必须按本流程执行。目标是让每次变更都有版本目标、范围边界、验证记录和可回溯说明。

## 版本号规则

项目使用轻量 SemVer：

- `MAJOR`：破坏现有接口、数据结构或运行方式的大改动。
- `MINOR`：新增功能、页面能力或后端能力，保持兼容。
- `PATCH`：bug 修复、样式修正、文档更新、测试补强。

当前版本：`0.3.0`

建议节奏：

- 小修复：`0.3.1`
- 继续优化个人观赛面板、卡片细节和直播入口：`0.3.x`
- 增加收藏关注、提醒、日历订阅等能力：`0.4.0`
- 改 API 响应结构或部署架构：评估是否进入 `1.0.0` 前置阶段

## 每次更新前

1. 明确目标版本。
2. 写清楚本次范围：
   - 要做什么
   - 不做什么
   - 涉及哪些文件或模块
3. 检查当前状态：

```bash
npm test
npm run build
```

4. 如项目已初始化 Git，创建更新分支：

```bash
git checkout -b release/0.2.1
```

或：

```bash
git checkout -b feature/<short-name>
```

## 开发中

1. 保持变更范围小。
2. 涉及 API 响应结构时，必须同步更新：
   - `shared/match.ts`
   - 后端 mapper
   - 前端展示逻辑
   - 测试
   - `CHANGELOG.md`
3. 涉及 PandaScore 字段时，先抓样本确认字段存在，再写 mapper。
4. 不展示或提交 token。
5. 不把探索性代码留在主路径。

## 合入前验收

每个版本至少执行：

```bash
npm test
npm run build
```

涉及真实数据时，额外执行真实数据烟测：

```bash
npx tsx -e 'import dotenv from "dotenv"; dotenv.config({ path: ".env.local" }); async function main() { const { getMatches } = await import("./server/services/matchService.ts"); const response = await getMatches({ date: "YYYY-MM-DD", game: "all", refresh: true }); console.log({ count: response.matches.length, stale: response.stale, first: response.matches[0]?.tournament }); } main();'
```

涉及前端 UI 时，至少检查：

- 桌面宽度页面无明显错位。
- 手机宽度页面无横向滚动。
- loading、error、empty 至少有一种方式被验证。
- 今天、明天、游戏筛选、刷新按钮可用。

## 文档更新

每个版本必须更新：

- `CHANGELOG.md`

按需要更新：

- `README.md`
- `docs/project-status.md`
- `docs/planning/<version>/requirements.md`
- `docs/planning/<version>/detailed-design.md`
- `docs/planning/<version>/implementation-tasks.md`

## 发布记录

如果项目已经初始化 Git，发布时执行：

```bash
git status
npm test
npm run build
git add .
git commit -m "Release 0.2.1"
git tag v0.2.1
```

如果没有 Git，至少在 `CHANGELOG.md` 中记录：

- 版本号
- 日期
- Added / Changed / Fixed / Verified / Known Gaps

## 禁止事项

- 禁止把 token 写进可提交文件。
- 禁止不更新 `CHANGELOG.md` 就完成版本变更。
- 禁止直接修改 API 响应结构但不更新共享类型和前端消费逻辑。
- 禁止只凭记忆改 PandaScore 字段；必须用样本或文档确认。
- 禁止在测试或构建失败时标记版本完成。

## 推荐的下一个版本

建议 `0.3.0` 做个人关注能力升级：

- 收藏常看的队伍、赛事或游戏。
- 增加“我的关注”视图。
- 增加开赛提醒或日历订阅。
- 根据个人偏好微调排序。
