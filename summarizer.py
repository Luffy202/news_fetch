"""Kimi AI 文章摘要模块"""

import time

from openai import OpenAI

import config


def summarize_article(content):
    """调用 Kimi API 生成文章摘要，失败返回空字符串"""
    if not content:
        return ""

    client = OpenAI(
        api_key=config.KIMI_API_KEY,
        base_url="https://api.moonshot.cn/v1",
    )

    try:
        response = client.chat.completions.create(
            model=getattr(config, "KIMI_MODEL", "moonshot-v1-32k"),
            messages=[
                {
                    "role": "system",
                    "content": "你是一个文章摘要助手。请用1-2句话概括文章的核心内容，简洁精炼。",
                },
                {
                    "role": "user",
                    "content": content,
                },
            ],
            temperature=0.3,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"    AI 摘要生成失败: {e}")
        return ""


def enrich_articles_with_summary(articles):
    """为文章列表添加 AI 摘要，KIMI_API_KEY 为空时静默跳过"""
    api_key = getattr(config, "KIMI_API_KEY", "")
    if not api_key:
        return

    interval = getattr(config, "KIMI_REQUEST_INTERVAL", 2)
    total = len(articles)
    print(f"  开始生成 AI 摘要（共 {total} 篇）...")

    for i, article in enumerate(articles):
        print(f"    [{i+1}/{total}] 生成摘要: {article.get('title', '')[:30]}...")
        article["summary"] = summarize_article(article.get("content", ""))
        if i < total - 1:
            time.sleep(interval)

    print(f"  AI 摘要生成完成")
