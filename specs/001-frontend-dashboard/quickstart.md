# Quickstart: 微信公众号前端管理看板

## 目标

为现有微信公众号爬取工具增加一个单用户前端管理台，支持公众号管理、爬取任务执行、飞书推送、源数据看板和 Markdown 下载。

## 预期结构

```text
backend/
frontend/
specs/001-frontend-dashboard/
```

## 建议实施顺序

1. 新增后端 API 服务骨架，封装现有爬虫模块
2. 新增数据持久化层，用于保存设置、公众号、历史批次和文章
3. 打通登录状态、启动爬取、查询任务状态、查询历史批次 API
4. 搭建 Vite 前端管理台骨架
5. 实现公众号管理与当前任务执行页面
6. 实现历史批次、文章详情、飞书推送
7. 实现数据看板与 Markdown/ZIP 下载

## 运行准备

### 1. Python 依赖

```bash
pip3 install -r requirements.txt
playwright install chromium
```

### 2. 前端初始化

```bash
cd frontend
npm install
```

## 首批推荐接口

- `POST /api/auth/login`
- `GET /api/auth/status`
- `GET /api/accounts`
- `POST /api/accounts`
- `DELETE /api/accounts/{id}`
- `PATCH /api/accounts/{id}`
- `POST /api/crawl`
- `GET /api/crawl/current`
- `GET /api/batches`
- `GET /api/batches/{id}`
- `POST /api/batches/{id}/feishu-push`
- `GET /api/dashboard/summary`
- `GET /api/articles/{id}/markdown`
- `GET /api/batches/{id}/markdown-export`
- `GET /api/settings`
- `PATCH /api/settings`

## 首版验收重点

- 可以在前端添加、删除、勾选公众号
- 可以触发一轮爬取，并看到实时进度
- 可以保留并查看历史批次
- 可以把当前轮次中用户选中公众号的结果推送到飞书
- 可以查看源数据看板
- 可以下载单篇 Markdown 或批量 ZIP

## 风险提醒

- WeChat 登录依赖扫码与 session 有效期，需要在 UI 中明确提示
- 上游平台限流明显，必须坚持单轮任务和顺序处理策略
- 飞书卡片长度可能受限，需在实现阶段处理截断与提示