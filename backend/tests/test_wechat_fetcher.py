import unittest
from unittest.mock import Mock, patch


class TestWechatFetcher(unittest.TestCase):
    def setUp(self):
        import backend.services.wechat_fetcher as wechat_fetcher

        self.fetcher = wechat_fetcher
        self.fetcher._cookie = ''
        self.fetcher._token = ''
        self.original_session = self.fetcher._session

    def tearDown(self):
        self.fetcher.set_request_session(self.original_session)

    def test_set_credentials(self):
        self.fetcher.set_credentials('test_cookie', 'test_token')
        self.assertEqual(self.fetcher._cookie, 'test_cookie')
        self.assertEqual(self.fetcher._token, 'test_token')

    def test_get_headers_includes_cookie(self):
        self.fetcher.set_credentials('my_cookie', '123')
        headers = self.fetcher._get_headers()
        self.assertEqual(headers['Cookie'], 'my_cookie')
        self.assertIn('User-Agent', headers)

    def test_search_account_success(self):
        mock_session = Mock()
        mock_session.get.return_value.json.return_value = {
            'base_resp': {'ret': 0},
            'list': [{'nickname': '测试号', 'fakeid': 'fake123'}],
        }
        mock_session.get.return_value.raise_for_status.return_value = None
        self.fetcher.set_request_session(mock_session)
        result = self.fetcher.search_account('测试号')
        self.assertEqual(result, 'fake123')

    def test_search_accounts_returns_candidates(self):
        mock_session = Mock()
        mock_session.get.return_value.json.return_value = {
            'base_resp': {'ret': 0},
            'list': [
                {'nickname': '测试号日报', 'fakeid': 'fake-1'},
                {'nickname': '测试号观察', 'fakeid': 'fake-2'},
            ],
        }
        mock_session.get.return_value.raise_for_status.return_value = None
        self.fetcher.set_request_session(mock_session)

        candidates = self.fetcher.search_accounts('测试号')
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0]['nickname'], '测试号日报')

    def test_get_articles_success(self):
        mock_session = Mock()
        mock_session.get.return_value.json.return_value = {
            'base_resp': {'ret': 0},
            'app_msg_list': [
                {
                    'title': '文章1',
                    'link': 'https://mp.weixin.qq.com/s/abc',
                    'digest': '摘要',
                    'cover': 'https://img.example.com/1.jpg',
                    'create_time': 1700000000,
                    'aid': 'aid1',
                }
            ],
        }
        mock_session.get.return_value.raise_for_status.return_value = None
        self.fetcher.set_request_session(mock_session)
        articles = self.fetcher.get_articles('fake123', count=5)
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0]['title'], '文章1')

    @patch('backend.services.wechat_fetcher.time.sleep')
    @patch('backend.services.wechat_fetcher.get_articles')
    @patch('backend.services.wechat_fetcher.search_account')
    def test_fetch_account_articles(self, mock_search, mock_articles, mock_sleep):
        mock_search.return_value = 'fake123'
        mock_articles.return_value = [{'title': '文章1', 'url': 'https://example.com'}]
        result = self.fetcher.fetch_account_articles('测试号', 5)
        self.assertEqual(result['name'], '测试号')
        self.assertEqual(result['fakeid'], 'fake123')
        self.assertEqual(len(result['articles']), 1)
        mock_sleep.assert_called_once()


if __name__ == '__main__':
    unittest.main()
