"""文章正文解析模块"""

import time
import requests
from bs4 import BeautifulSoup

from config import REQUEST_INTERVAL


def fetch_article_content(url):
    """抓取并解析文章正文内容"""
    if not url:
        return ""

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "lxml")

        # 微信文章正文在 id="js_content" 的 div 中
        content_div = soup.find("div", id="js_content")
        if not content_div:
            # 备用选择器
            content_div = soup.find("div", class_="rich_media_content")

        if content_div:
            # 提取纯文本，保留段落换行
            text = content_div.get_text(separator="\n", strip=True)
            return text
        else:
            return "[无法解析正文内容]"

    except Exception as e:
        return f"[抓取失败: {e}]"


def enrich_articles_with_content(articles):
    """为文章列表添加正文内容"""
    total = len(articles)
    for i, article in enumerate(articles):
        print(f"    [{i+1}/{total}] 抓取正文: {article['title'][:30]}...")
        article["content"] = fetch_article_content(article["url"])
        if i < total - 1:
            time.sleep(REQUEST_INTERVAL)
