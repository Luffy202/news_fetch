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

## 一键启动（Docker）

适用于“拉代码后直接启动”的场景。

### 1. 前置条件

- 已安装 Docker 和 Docker Compose

### 2. 一键启动

macOS / Linux：

```bash
bash scripts/start.sh
```

Windows（PowerShell 或 CMD）：

```bat
scripts\start.bat
```

可直接双击根目录文件：

- `启动项目.command`
- `停止项目.command`
- `启动项目.bat`
- `停止项目.bat`

启动后访问：

- 前端：`http://localhost:8080`
- 后端：`http://localhost:8000`
- 后端健康检查：`http://localhost:8000/health`

默认会自动打开浏览器访问前端；如需关闭自动打开：

- macOS / Linux：`AUTO_OPEN_BROWSER=0 bash scripts/start.sh`
- Windows：`set AUTO_OPEN_BROWSER=0 && scripts\start.bat`

### 3. 停止服务

macOS / Linux：

```bash
bash scripts/stop.sh
```

Windows：

```bat
scripts\stop.bat
```

### 4. 登录模式（推荐容器环境使用 env）

- `AUTH_MODE=auto`：默认，优先读取环境变量凭证，不存在则尝试 Playwright 登录
- `AUTH_MODE=env`：只使用 `WECHAT_COOKIE` 和 `WECHAT_TOKEN`
- `AUTH_MODE=playwright`：只使用 Playwright 扫码登录

容器环境推荐先设置凭证再启动：

```bash
export AUTH_MODE=env
export WECHAT_COOKIE='你的cookie'
export WECHAT_TOKEN='你的token'
bash scripts/start.sh
```

Windows 对应写法：

```bat
set AUTH_MODE=env
set WECHAT_COOKIE=你的cookie
set WECHAT_TOKEN=你的token
scripts\start.bat
```

`AUTH_MODE=playwright` 在容器里是否能显示扫码窗口取决于主机是否提供图形显示能力；普通 Docker Desktop 默认环境下通常不可用，推荐使用 `AUTH_MODE=env`。

### 4.1 后端运行模式

- `BACKEND_RUN_MODE=docker`：默认，前后端都在容器中运行
- `BACKEND_RUN_MODE=local`：后端在本机运行；Windows 下默认前端也本机运行（适合可视化扫码）

macOS / Linux：

```bash
export BACKEND_RUN_MODE=local
export AUTH_MODE=playwright
bash scripts/start.sh
```

Windows：

```bat
set BACKEND_RUN_MODE=local
set AUTH_MODE=playwright
scripts\start.bat
```

`BACKEND_RUN_MODE=local` 会在本机启动后端进程；Windows 默认同时本机启动前端（端口 8080），可通过 `set FRONTEND_RUN_MODE=docker` 强制前端容器模式。

### 5. 数据持久化目录

- `data/`：SQLite 数据库
- `browser_data/`：登录态相关浏览器数据
- `output/`：导出文件

## 部署到 Vercel

推荐将 `frontend/` 部署到 Vercel，后端 `backend/` 部署到支持长任务与持久化存储的平台（如自建服务器、云主机或容器平台）。

### 1. 准备后端 API 地址

- 先部署后端，并确保 `https://<your-backend-domain>/health` 可访问
- 记录后端域名（不要带尾部 `/`），例如 `https://api.example.com`

### 2. 在 Vercel 导入项目

- 直接导入当前仓库
- 本仓库已包含根目录 `vercel.json`，会自动使用 `frontend/` 进行构建并输出静态文件

### 3. 配置前端环境变量

在 Vercel 项目设置的 Environment Variables 添加：

- `VITE_API_BASE_URL=https://api.example.com`

前端会优先读取 `VITE_API_BASE_URL`；本地未配置时默认使用 `http://localhost:8000`。

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

## OpenClaw 一键对接

仓库内已经内置好 OpenClaw 用的项目专属 skill，同时补了一键接入脚本：

- `scripts/setup_openclaw.sh`
- `skills/news-fetch-flow/SKILL.md`
- `skills/news-fetch-flow/scripts/news_fetch_client.py`
- `skills/news-fetch-flow/references/api.md`

如果你的本机还没有 OpenClaw，直接执行：

```bash
bash scripts/setup_openclaw.sh
```

这个脚本会依次完成：

1. 检查是否已安装 `openclaw`
2. 缺失时调用 OpenClaw 官方安装脚本
3. 执行 `openclaw setup --workspace ~/.openclaw/workspace`
4. 将仓库内 skill 软链接到 `~/.openclaw/workspace/skills/news-fetch-flow`
5. 将当前仓库软链接到 `~/.openclaw/workspace/projects/news_fetch`
6. 检查本地 `news_fetch` 后端是否已启动

这样做的目的是让 OpenClaw 在默认工作区里就能直接看到：

- 可调用的 skill
- 当前项目源码
- 当前项目的 `README.md`

### 让 OpenClaw 自己继续完成配置

完成脚本后，打开 OpenClaw：

```bash
openclaw dashboard
```

然后在 OpenClaw 里直接说：

```text
请先阅读 ~/.openclaw/workspace/projects/news_fetch/README.md 里的“OpenClaw 一键对接”章节，再检查 http://127.0.0.1:8000 服务状态，并使用 news_fetch_flow skill 协助我完成登录、添加公众号和启动抓取。
```

如果本地服务尚未启动，先运行：

```bash
bash scripts/start.sh
```

### 可选环境变量

- `OPENCLAW_WORKSPACE=/path/to/workspace`：自定义 OpenClaw 工作区
- `OPENCLAW_REPO_ALIAS=my_news_fetch`：自定义项目在 OpenClaw 工作区内的挂载目录名
- `SKIP_OPENCLAW_INSTALL=1`：只做挂载与检查，不自动安装 OpenClaw
- `NEWS_FETCH_BASE_URL=http://127.0.0.1:8000`：自定义本地后端地址

### 仓库内 Skill 说明

该 skill 用于让 OpenClaw 直接调用本地 `news_fetch` API，完成服务检查、登录检查/刷新、公众号预检与添加、勾选、启动抓取、查看批次与触发推送。

本地快速验证：

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py health
python3 skills/news-fetch-flow/scripts/news_fetch_client.py auth-status
python3 skills/news-fetch-flow/scripts/news_fetch_client.py batches-list
```

默认 API 地址固定为：

```text
http://127.0.0.1:8000
```

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
- `GET /api/articles/{articleId}/docx`
- `GET /api/batches/{batchId}/markdown-export`
