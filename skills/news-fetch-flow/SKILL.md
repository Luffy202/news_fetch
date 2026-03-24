---
name: news_fetch_flow
description: Use this skill when the user wants OpenClaw to operate the local News Fetch service in this workspace, including checking service health, checking or refreshing login, prechecking and adding公众号, toggling account selection, starting a crawl, watching task progress, and reading or pushing batches via the local API at http://127.0.0.1:8000.
---

# News Fetch Flow

This skill lets OpenClaw operate the local `news_fetch` service through its existing HTTP API.

## When to use

Use this skill when the user wants to:

- 检查本地抓取服务状态
- 查看或刷新公众号登录态
- 预检并添加公众号
- 勾选或取消勾选公众号
- 启动抓取并查看当前进度
- 查看最新批次或指定批次详情
- 触发批次推送

## Rules

- 所有用户可见回复都使用中文。
- 调用任何写操作前，先用一句话说明接下来要做什么。
- 先确认本地 API 可达，再做后续动作。
- 预检返回候选公众号时，必须把候选列给用户确认，不得擅自选择第一条。
- 登录失效时，优先提示重新登录，并建议使用刷新登录态。
- 启动抓取后，要定期汇报当前任务状态、当前公众号、完成数。
- 优先通过脚本执行，不要在回复里堆砌原始 curl。

## Primary tool

Use the bundled client:

`python3 skills/news-fetch-flow/scripts/news_fetch_client.py <command> ...`

Supported commands:

- `health`
- `auth-status`
- `auth-login`
- `auth-login --force`
- `accounts-list`
- `accounts-precheck --name "<名称>"`
- `accounts-create --name "<原输入>" --resolved-name "<确认名称>" --fakeid "<fakeid>" [--selected]`
- `accounts-toggle --id <id> --selected true|false`
- `crawl-start`
- `crawl-current`
- `batches-list`
- `batches-detail --id <id>`
- `batches-push-feishu --id <id>`

## Recommended workflow

### 1. Service check

Before any operation:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py health
```

If unavailable, tell the user to start the local service at `http://127.0.0.1:8000`.

### 2. Login check / refresh

Check status:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py auth-status
```

Refresh login:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py auth-login --force
```

If login is `expired` or `failed`, guide the user to refresh login before continuing.

### 3. Add account

Always precheck first:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py accounts-precheck --name "<名称>"
```

- If status is `exact_match`, create directly.
- If status is `candidates`, show the candidates to the user and wait for confirmation.
- Do not create an account until a candidate is confirmed.

Create after confirmation:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py accounts-create --name "<原输入>" --resolved-name "<确认名称>" --fakeid "<fakeid>"
```

### 4. Start crawl

Before starting:

- inspect `accounts-list`
- make sure at least one account is selected
- inspect `auth-status`

Then:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py crawl-start
```

Track progress:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py crawl-current
```

Poll about every 3 seconds until status is no longer `running`.

### 5. Read latest batch

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py batches-list
```

Treat the first item as the latest batch.

Then:

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py batches-detail --id <batch_id>
```

### 6. Push a batch

```bash
python3 skills/news-fetch-flow/scripts/news_fetch_client.py batches-push-feishu --id <batch_id>
```

## References

For endpoint summary and common error meanings, see:

- `references/api.md`
