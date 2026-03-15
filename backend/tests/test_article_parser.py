import unittest
from unittest.mock import patch


class TestArticleParser(unittest.TestCase):
    @patch('backend.services.article_parser.requests.get')
    def test_fetch_article_content_success(self, mock_get):
        from backend.services.article_parser import fetch_article_content

        mock_get.return_value.text = """
        <html><body><div id=\"js_content\"><p>第一段</p><p>第二段</p></div></body></html>
        """
        mock_get.return_value.encoding = 'utf-8'
        content = fetch_article_content('https://mp.weixin.qq.com/s/abc')
        self.assertIn('第一段', content)
        self.assertIn('第二段', content)

    @patch('backend.services.article_parser.time.sleep')
    @patch('backend.services.article_parser.fetch_article_content')
    def test_enrich_articles_with_content(self, mock_fetch, mock_sleep):
        from backend.services.article_parser import enrich_articles_with_content

        mock_fetch.return_value = '文章正文'
        articles = [
            {'title': '文章1', 'url': 'https://example.com/1'},
            {'title': '文章2', 'url': 'https://example.com/2'},
        ]
        enrich_articles_with_content(articles)
        self.assertEqual(articles[0]['content'], '文章正文')
        self.assertEqual(articles[1]['content'], '文章正文')
        self.assertEqual(mock_sleep.call_count, 1)


if __name__ == '__main__':
    unittest.main()
