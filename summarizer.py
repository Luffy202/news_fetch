"""遗留兼容层：导出后端摘要实现。"""

from backend.services.article_summarizer import enrich_articles_with_summary, summarize_article

__all__ = ['summarize_article', 'enrich_articles_with_summary']
