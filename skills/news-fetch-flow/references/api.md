# News Fetch Local API

Base URL: `http://127.0.0.1:8000`

## Health

- `GET /health`
- success: `{"status":"ok"}`

## Auth

- `GET /api/auth/status`
- `POST /api/auth/login`
  - body: `{"force": true|false}`

Common states:

- `logged_out`
- `launching_browser`
- `waiting_for_scan`
- `verifying`
- `logged_in`
- `failed`
- `expired`

## Accounts

- `GET /api/accounts`
- `POST /api/accounts/precheck`
  - body: `{"name":"公众号名"}`
  - returns `exact_match` or `candidates`
- `POST /api/accounts`
  - body example:
    - `{"name":"原输入","resolvedName":"确认名称","fakeid":"fakeid","isSelected":false}`
- `PATCH /api/accounts/{accountId}`
  - body example:
    - `{"isSelected": true}`
- `DELETE /api/accounts/{accountId}`

## Crawl

- `POST /api/crawl`
- `GET /api/crawl/current`

`/api/crawl/current` important fields:

- `status`
- `message`
- `currentAccountName`
- `completedAccounts`
- `totalAccounts`
- `totalArticles`
- `pendingAccounts`
- `events`

## Batches

- `GET /api/batches`
- `GET /api/batches/{batchId}`
- `POST /api/batches/{batchId}/feishu-push`

`GET /api/batches/{batchId}` includes:

- batch metadata
- `selectedAccounts`
- `articles`
- `events`

## Error handling

Backend usually returns:

```json
{"detail":"中文错误说明"}
```

Prefer showing `detail` directly to the user.

Common messages:

- `请先完成微信登录`
- `微信登录状态已失效，请重新登录后再添加公众号`
- `该公众号已存在`
- `未找到该公众号，请确认名称是否正确`
- `请至少勾选一个公众号`
- `当前有抓取任务正在执行`
