"""遗留测试兼容入口。"""

import unittest

from backend.tests.test_article_parser import TestArticleParser
from backend.tests.test_article_summarizer import TestArticleSummarizer
from backend.tests.test_feishu_and_compat import TestAuthCompatibility, TestFeishuCompatibility
from backend.tests.test_wechat_fetcher import TestWechatFetcher

__all__ = [
    'TestWechatFetcher',
    'TestArticleParser',
    'TestArticleSummarizer',
    'TestFeishuCompatibility',
    'TestAuthCompatibility',
]


if __name__ == '__main__':
    unittest.main()
