# 0.1.0 文档归档

归档日期：2026-05-24

本目录保存 `v0.1.0` 标签对应的文档快照，用于回溯第一版 MVP 的需求、设计、任务拆分、项目状态和发布记录。

## 归档来源

- Git tag：`v0.1.0`
- Commit：`0f44ac7`
- 发布日期：2026-05-24

## 文档清单

- [README.md](./README.md)：0.1.0 项目说明。
- [CHANGELOG.md](./CHANGELOG.md)：0.1.0 发布记录。
- [requirements.md](./requirements.md)：0.1.0 需求文档。
- [detailed-design.md](./detailed-design.md)：0.1.0 详细设计。
- [implementation-tasks.md](./implementation-tasks.md)：0.1.0 可执行任务拆分。
- [prompt.md](./prompt.md)：0.1.0 MVP 实施起始 prompt。
- [docs/project-status.md](./docs/project-status.md)：0.1.0 项目状态。
- [docs/release-process.md](./docs/release-process.md)：0.1.0 后续发布流程。

## 0.1.0 范围摘要

0.1.0 的目标是完成个人可用的电竞赛程 MVP：

- 聚合 CS2、VALORANT、LoL 三类赛程。
- 默认展示北京时间当天赛程，并支持今天、明天切换。
- 支持按游戏项目筛选。
- 接入 PandaScore API，并通过后端代理隐藏 token。
- 支持缓存、手动刷新、stale 兜底。
- 展示比赛时间、赛事、队伍、状态、BO、比分和部分扩展赛果信息。

## 后续说明

当前主线文档会继续面向新版本演进。需要确认 0.1.0 原始内容时，以本目录和 `v0.1.0` 标签为准。
