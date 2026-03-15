"""遗留兼容层：导出后端正文解析实现。"""

from backend.services.article_parser import enrich_articles_with_content, fetch_article_content

__all__ = ['fetch_article_content', 'enrich_articles_with_content']
