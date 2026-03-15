from __future__ import annotations

import time

from openai import OpenAI

from backend import runtime_config


def summarize_article(content):
    if not content:
        return ''

    client = OpenAI(
        api_key=runtime_config.KIMI_API_KEY,
        base_url='https://api.moonshot.cn/v1',
    )

    try:
        response = client.chat.completions.create(
            model=runtime_config.KIMI_MODEL,
            messages=[
                {
                    'role': 'system',
                    'content': '你是一个文章摘要助手。请用1-2句话概括文章的核心内容，简洁精炼。',
                },
                {
                    'role': 'user',
                    'content': content,
                },
            ],
            temperature=0.3,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        print(f'    AI 摘要生成失败: {exc}')
        return ''


def enrich_articles_with_summary(articles):
    if not runtime_config.KIMI_API_KEY:
        return

    interval = runtime_config.KIMI_REQUEST_INTERVAL
    total = len(articles)
    print(f'  开始生成 AI 摘要（共 {total} 篇）...')

    for index, article in enumerate(articles):
        print(f"    [{index + 1}/{total}] 生成摘要: {article.get('title', '')[:30]}...")
        article['summary'] = summarize_article(article.get('content', ''))
        if index < total - 1:
            time.sleep(interval)

    print('  AI 摘要生成完成')
