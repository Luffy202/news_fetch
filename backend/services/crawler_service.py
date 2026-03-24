from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Iterable
import json
import logging

import requests

from backend import runtime_config
from backend.services.wechat_fetcher import fetch_account_articles, set_credentials, set_request_session
from backend.services.article_parser import enrich_articles_with_content, set_request_session as set_article_parser_session
from backend.services.article_summarizer import enrich_articles_with_summary


class CrawlerService:
    def __init__(self) -> None:
        self._cookie = runtime_config.COOKIE
        self._token = runtime_config.TOKEN
        self._output_path = Path(__file__).resolve().parents[2] / 'output' / 'articles.json'
        self._session = self._build_session(runtime_config.PROXY_URL)
        set_request_session(self._session)
        set_article_parser_session(self._session)
        if self._cookie and self._token:
            set_credentials(self._cookie, self._token)

    def set_credentials(self, cookie: str, token: str) -> None:
        self._cookie = cookie
        self._token = token
        set_credentials(cookie, token)
        logger.info('更新爬虫凭证成功')

    def _build_session(self, proxy_url: str | None) -> requests.Session:
        session = requests.Session()
        session.trust_env = False
        if proxy_url:
            session.proxies.update({'http': proxy_url, 'https': proxy_url})
        return session

    def has_credentials(self) -> bool:
        return bool(self._cookie and self._token)

    def crawl_accounts(self, account_names: Iterable[str], article_count: int, progress_callback=None):
        if not self.has_credentials():
            raise ValueError('请先完成扫码登录')
        results = []
        account_names = list(account_names)
        for index, name in enumerate(account_names):
            if progress_callback is not None:
                progress_callback(name, account_names[index + 1:])
            logger.info('开始抓取公众号: %s', name)
            account_data = fetch_account_articles(name, article_count)
            if not account_data:
                continue
            enrich_articles_with_content(account_data['articles'])
            for article in account_data['articles']:
                publish_time = article.get('publish_time', 0)
                if isinstance(publish_time, int) and publish_time > 0:
                    article['publish_time'] = datetime.fromtimestamp(publish_time).strftime('%Y-%m-%d %H:%M:%S')
            enrich_articles_with_summary(account_data['articles'])
            results.append(account_data)
            logger.info('公众号抓取完成: %s, articles=%s', name, len(account_data['articles']))
        self.write_legacy_output(results)
        return results

    def apply_runtime_settings(self, request_interval: float, proxy_url: str | None = None) -> None:
        runtime_config.REQUEST_INTERVAL = request_interval
        runtime_config.PROXY_URL = proxy_url or ''
        self._session = self._build_session(runtime_config.PROXY_URL)
        set_request_session(self._session)
        set_article_parser_session(self._session)

    def write_legacy_output(self, results) -> None:
        payload = {
            'accounts': results,
            'fetch_time': datetime.utcnow().isoformat(),
        }
        self._output_path.parent.mkdir(parents=True, exist_ok=True)
        self._output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        logger.info('兼容 JSON 输出已写入: %s', self._output_path)


logger = logging.getLogger(__name__)

crawler_service = CrawlerService()
