from __future__ import annotations

import time

import requests
from bs4 import BeautifulSoup

from backend import runtime_config


def fetch_article_content(url):
    if not url:
        return ''

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36',
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        content_div = soup.find('div', id='js_content')
        if not content_div:
            content_div = soup.find('div', class_='rich_media_content')

        if content_div:
            return content_div.get_text(separator='\n', strip=True)
        return '[无法解析正文内容]'
    except Exception as exc:
        return f'[抓取失败: {exc}]'


def enrich_articles_with_content(articles):
    total = len(articles)
    for index, article in enumerate(articles):
        print(f"    [{index + 1}/{total}] 抓取正文: {article['title'][:30]}...")
        article['content'] = fetch_article_content(article['url'])
        if index < total - 1:
            time.sleep(runtime_config.REQUEST_INTERVAL)
