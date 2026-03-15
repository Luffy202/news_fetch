# Implementation Plan: 微信公众号前端管理看板

**Branch**: `001-frontend-dashboard` | **Date**: 2026-03-14 | **Spec**: `specs/001-frontend-dashboard/spec.md`
**Input**: Feature specification from `specs/001-frontend-dashboard/spec.md`

## Summary

为现有微信公众号爬取工具增加一个单用户前端管理台。整体方案是在保留现有 Python 爬虫核心模块的基础上，新增一个轻量级 FastAPI 后端 API 层和一个 Vite 前端单页应用，并使用 SQLite 持久化保存公众号、设置、历史批次、文章数据和任务状态。系统按“单用户、单轮任务、保留历史”的约束设计，支持公众号管理、当前轮次爬取、飞书推送、源数据看板和 Markdown/ZIP 导出。

## Technical Context

**Language/Version**: Python 3.x（现有后端）, TypeScript（Vite 前端）
**Primary Dependencies**: FastAPI, sqlite3/SQLModel-or-SQLAlchemy-lite, Playwright, requests, BeautifulSoup, Vite
**Storage**: SQLite（主存储） + Markdown/ZIP 导出文件
**Testing**: unittest（现有后端）, 前端测试待在实施中确定
**Target Platform**: 本机或受控内网环境中的 Web 管理台
**Project Type**: web application
**Performance Goals**: 2 秒内展示任务启动反馈与看板摘要；支持单轮任务顺序爬取多个公众号并完整保留历史
**Constraints**: 单用户、无需登录；同一时间仅允许一轮爬取任务；遵守既有请求间隔与上游限流约束；用户可在 session 失效时重新扫码认证
**Scale/Scope**: 单实例部署；管理数十个公众号、保留多轮历史批次、单轮可抓取每号最多数十篇文章

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

当前仓库未提供 `.specify/memory/constitution.md`，因此无额外项目宪章约束可执行。现有计划仅遵守已知仓库约束：

- 复用现有 Python 爬虫模块，不推翻已验证的数据抓取链路
- 用户可见文本保持中文
- 遵守既有 WeChat 请求间隔与登录模式
- 不引入超出单用户场景的复杂权限体系

**Gate Status**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── api/
├── services/
├── models/
├── storage/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   └── types/
└── tests/

existing root modules/
├── auth.py
├── fetcher.py
├── parser.py
├── notifier.py
├── summarizer.py
└── config.py
```

**Structure Decision**: 采用前后端分离的 Web 应用结构。现有根目录 Python 模块继续作为底层领域逻辑存在；新增 `backend/` 用于 API 封装和持久化层，新增 `frontend/` 用于 Vite 管理台。该结构最适合同时满足前端页面、API 接口、历史批次管理与后续扩展需求。

## Phase 0: Research Output

已在 `specs/001-frontend-dashboard/research.md` 中完成以下关键决策：

- 选择 FastAPI 作为后端 API 封装层
- 选择 SQLite 作为主持久化存储
- 选择单页管理台作为前端交互模式
- 保留服务端 Playwright 扫码登录模式
- 执行单轮任务单活约束

## Phase 1: Design Output

### Data Model

数据模型已定义于 `specs/001-frontend-dashboard/data-model.md`，覆盖：

- 公众号（Account）
- 系统设置（Settings）
- 爬取任务/历史批次（Crawl Task / Batch）
- 文章（Article）
- 任务事件/进度日志（Task Event）

### Contracts

接口契约已定义于 `specs/001-frontend-dashboard/contracts/openapi.yaml`，覆盖：

- 登录状态与触发登录
- 公众号增删改查
- 当前爬取任务与历史批次查询
- 飞书推送
- 数据看板
- Markdown / ZIP 导出
- 设置读写

### Quickstart

实施引导已定义于 `specs/001-frontend-dashboard/quickstart.md`。

## Post-Design Constitution Check

设计阶段未引入额外违反仓库约束的内容：

- 未改变现有爬虫核心职责，仅在外层封装 API
- 未引入多用户权限模型
- 未改变中文输出与扫码登录前提
- 未引入与单机部署不相称的重型基础设施

**Gate Status**: PASS

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
