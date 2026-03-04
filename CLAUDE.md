# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

微信公众号文章爬取工具。通过微信公众平台后台 API 搜索公众号、获取文章列表，并抓取正文内容，输出为 JSON。

## Running

```bash
pip3 install -r requirements.txt
playwright install chromium
python3 main.py
```

Output goes to `output/articles.json`.

## Architecture

**Credential flow:** `main.py` checks `config.COOKIE/TOKEN` — if set, uses manual credentials; if empty, calls `auth.get_credentials()` which launches a Playwright persistent-context browser for QR-code login. Credentials are injected into `fetcher` via `fetcher.set_credentials(cookie, token)`.

**Data flow:** `main.py` → `fetcher.fetch_account_articles()` (searches account by name via `searchbiz` API, then fetches article list via `appmsg` API) → `parser.enrich_articles_with_content()` (fetches each article URL and extracts text with BeautifulSoup).

Key modules:
- `auth.py` — Playwright-based auto login, persistent session in `browser_data/`
- `fetcher.py` — WeChat platform API calls (module-level `_cookie`/`_token` set dynamically)
- `parser.py` — Article HTML scraping (targets `#js_content` div)
- `config.py` — User configuration (accounts list, credentials, rate limiting)

## Conventions

- All user-facing output is in Chinese
- Rate limiting between requests is controlled by `config.REQUEST_INTERVAL` (default 4s)
- `browser_data/` stores Playwright persistent context and should not be committed
