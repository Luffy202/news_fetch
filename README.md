# 微信公众号前端管理看板

本项目在原有微信公众号文章爬取脚本基础上，增加了本地单用户前端管理台与 FastAPI 后端。

## 功能

- 公众号添加、删除、勾选持久化
- 扫码登录与单任务爬取
- 历史批次与文章详情查看
- 当前批次飞书推送
- 源数据看板
- 单篇 Markdown 与批量 ZIP 下载

## 目录

- `backend/`：唯一主实现面，包含 FastAPI、持久化与核心登录/抓取/解析/摘要能力
- `frontend/`：Vite + React + TypeScript 前端
- 根目录脚本：仅保留兼容层，供过渡期 CLI 复用
- `backend/tests/`：后端主实现的回归测试

## 运行

### 1. 安装 Python 依赖

```bash
pip3 install -r requirements.txt
pip3 install -r backend/requirements.txt
python -m playwright install chromium
```

如果当前环境没有 `pip3`，也可以使用对应 Python 启动器执行，例如：`py -m pip install -r backend/requirements.txt`，再执行 `py -m playwright install chromium`。

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端

```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

后端现在是唯一主运行面，前端只通过 `/api/*` 访问后端。

### 4. 启动前端

```bash
cd frontend
npm run dev
```

默认访问：`http://localhost:5173`

## 说明

- SQLite 数据默认保存在 `data/dashboard.db`
- 兼容旧消费者的 JSON 输出仍会写到 `output/articles.json`
- 飞书推送以后端 `backend/services/feishu_service.py` 为主实现
- 首次使用需要扫码登录微信公众号后台
- 运行时设置优先走后端设置表；CLI 兼容模式读取环境变量，例如 `WECHAT_COOKIE`、`WECHAT_TOKEN`、`KIMI_API_KEY`、`FEISHU_WEBHOOK`

## 兼容说明

- `main.py` 仍可作为过渡期 CLI 入口，但内部已改为调用后端服务
- 根目录 `auth.py`、`fetcher.py`、`parser.py`、`summarizer.py`、`notifier.py`、`config.py` 已降级为兼容包装层
- 回归测试已迁入 `backend/tests/`，根目录 `tests.py` 仅保留兼容入口
- 后续若确认不再需要 CLI，可在稳定周期后移除这些兼容层与根目录测试入口

## 测试

```bash
python -m unittest backend.tests.test_wechat_fetcher backend.tests.test_article_parser backend.tests.test_article_summarizer backend.tests.test_feishu_and_compat
```

## 已实现接口

- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/{accountId}`
- `DELETE /api/accounts/{accountId}`
- `GET /api/auth/status`
- `POST /api/auth/login`
- `POST /api/crawl`
- `GET /api/crawl/current`
- `GET /api/batches`
- `GET /api/batches/{batchId}`
- `POST /api/batches/{batchId}/feishu-push`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/dashboard/summary`
- `GET /api/articles/{articleId}/markdown`
- `GET /api/batches/{batchId}/markdown-export`
