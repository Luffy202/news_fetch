import unittest
from unittest.mock import MagicMock, patch


class TestArticleSummarizer(unittest.TestCase):
    @patch('backend.services.article_summarizer.runtime_config')
    @patch('backend.services.article_summarizer.OpenAI')
    def test_summarize_article_success(self, mock_openai_cls, mock_config):
        from backend.services.article_summarizer import summarize_article

        mock_config.KIMI_API_KEY = 'test-key'
        mock_config.KIMI_MODEL = 'test-model'
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content='这是一篇关于AI的文章。'))
        ]

        result = summarize_article('一篇关于AI发展的长文...')
        self.assertEqual(result, '这是一篇关于AI的文章。')

    @patch('backend.services.article_summarizer.summarize_article')
    @patch('backend.services.article_summarizer.runtime_config')
    @patch('backend.services.article_summarizer.time.sleep')
    def test_enrich_articles_with_summary(self, mock_sleep, mock_config, mock_summarize):
        from backend.services.article_summarizer import enrich_articles_with_summary

        mock_config.KIMI_API_KEY = 'test-key'
        mock_config.KIMI_REQUEST_INTERVAL = 2
        mock_summarize.return_value = 'AI摘要'
        articles = [
            {'title': '文章1', 'content': '内容1'},
            {'title': '文章2', 'content': '内容2'},
        ]
        enrich_articles_with_summary(articles)
        self.assertEqual(articles[0]['summary'], 'AI摘要')
        self.assertEqual(articles[1]['summary'], 'AI摘要')
        self.assertEqual(mock_sleep.call_count, 1)


if __name__ == '__main__':
    unittest.main()
