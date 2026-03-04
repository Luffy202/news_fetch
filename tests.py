"""项目单元测试"""

import unittest
from unittest.mock import patch, MagicMock


class TestFetcherSetCredentials(unittest.TestCase):
    def setUp(self):
        import fetcher
        self.fetcher = fetcher
        # 每次测试前重置凭证
        self.fetcher._cookie = ""
        self.fetcher._token = ""

    def test_set_credentials(self):
        self.fetcher.set_credentials("test_cookie", "test_token")
        self.assertEqual(self.fetcher._cookie, "test_cookie")
        self.assertEqual(self.fetcher._token, "test_token")

    def test_get_headers_includes_cookie(self):
        self.fetcher.set_credentials("my_cookie", "123")
        headers = self.fetcher._get_headers()
        self.assertEqual(headers["Cookie"], "my_cookie")
        self.assertIn("User-Agent", headers)


class TestFetcherSearchAccount(unittest.TestCase):
    def setUp(self):
        import fetcher
        self.fetcher = fetcher
        self.fetcher.set_credentials("cookie", "token")

    @patch("fetcher.requests.get")
    def test_search_account_success(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": 0},
            "list": [{"nickname": "测试号", "fakeid": "fake123"}],
        }
        result = self.fetcher.search_account("测试号")
        self.assertEqual(result, "fake123")

    @patch("fetcher.requests.get")
    def test_search_account_not_found(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": 0},
            "list": [],
        }
        result = self.fetcher.search_account("不存在")
        self.assertIsNone(result)

    @patch("fetcher.requests.get")
    def test_search_account_api_error(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": -1, "err_msg": "invalid token"},
        }
        result = self.fetcher.search_account("测试号")
        self.assertIsNone(result)


class TestFetcherGetArticles(unittest.TestCase):
    def setUp(self):
        import fetcher
        self.fetcher = fetcher
        self.fetcher.set_credentials("cookie", "token")

    @patch("fetcher.requests.get")
    def test_get_articles_success(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": 0},
            "app_msg_list": [
                {
                    "title": "文章1",
                    "link": "https://mp.weixin.qq.com/s/abc",
                    "digest": "摘要",
                    "cover": "https://img.example.com/1.jpg",
                    "create_time": 1700000000,
                    "aid": "aid1",
                },
            ],
        }
        articles = self.fetcher.get_articles("fake123", count=5)
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0]["title"], "文章1")
        self.assertEqual(articles[0]["url"], "https://mp.weixin.qq.com/s/abc")
        self.assertEqual(articles[0]["publish_time"], 1700000000)

    @patch("fetcher.requests.get")
    def test_get_articles_api_error(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": -1, "err_msg": "error"},
        }
        articles = self.fetcher.get_articles("fake123")
        self.assertEqual(articles, [])

    @patch("fetcher.requests.get")
    def test_get_articles_empty_list(self, mock_get):
        mock_get.return_value.json.return_value = {
            "base_resp": {"ret": 0},
            "app_msg_list": [],
        }
        articles = self.fetcher.get_articles("fake123")
        self.assertEqual(articles, [])


class TestFetchAccountArticles(unittest.TestCase):
    def setUp(self):
        import fetcher
        self.fetcher = fetcher
        self.fetcher.set_credentials("cookie", "token")

    @patch("fetcher.time.sleep")
    @patch("fetcher.get_articles")
    @patch("fetcher.search_account")
    def test_full_flow_success(self, mock_search, mock_articles, mock_sleep):
        mock_search.return_value = "fake123"
        mock_articles.return_value = [{"title": "文章1", "url": "https://example.com"}]

        result = self.fetcher.fetch_account_articles("测试号", 5)
        self.assertEqual(result["name"], "测试号")
        self.assertEqual(result["fakeid"], "fake123")
        self.assertEqual(len(result["articles"]), 1)
        mock_sleep.assert_called_once()

    @patch("fetcher.search_account")
    def test_full_flow_account_not_found(self, mock_search):
        mock_search.return_value = None
        result = self.fetcher.fetch_account_articles("不存在", 5)
        self.assertIsNone(result)


class TestParser(unittest.TestCase):
    @patch("parser.requests.get")
    def test_fetch_article_content_success(self, mock_get):
        from parser import fetch_article_content

        mock_get.return_value.text = """
        <html><body>
            <div id="js_content">
                <p>第一段</p>
                <p>第二段</p>
            </div>
        </body></html>
        """
        mock_get.return_value.encoding = "utf-8"
        content = fetch_article_content("https://mp.weixin.qq.com/s/abc")
        self.assertIn("第一段", content)
        self.assertIn("第二段", content)

    @patch("parser.requests.get")
    def test_fetch_article_content_fallback_selector(self, mock_get):
        from parser import fetch_article_content

        mock_get.return_value.text = """
        <html><body>
            <div class="rich_media_content">
                <p>备用内容</p>
            </div>
        </body></html>
        """
        mock_get.return_value.encoding = "utf-8"
        content = fetch_article_content("https://mp.weixin.qq.com/s/abc")
        self.assertIn("备用内容", content)

    @patch("parser.requests.get")
    def test_fetch_article_content_no_content(self, mock_get):
        from parser import fetch_article_content

        mock_get.return_value.text = "<html><body><p>无关内容</p></body></html>"
        mock_get.return_value.encoding = "utf-8"
        content = fetch_article_content("https://mp.weixin.qq.com/s/abc")
        self.assertEqual(content, "[无法解析正文内容]")

    def test_fetch_article_content_empty_url(self):
        from parser import fetch_article_content

        self.assertEqual(fetch_article_content(""), "")
        self.assertEqual(fetch_article_content(None), "")

    @patch("parser.requests.get")
    def test_fetch_article_content_request_error(self, mock_get):
        from parser import fetch_article_content

        mock_get.side_effect = Exception("网络错误")
        content = fetch_article_content("https://mp.weixin.qq.com/s/abc")
        self.assertIn("抓取失败", content)

    @patch("parser.time.sleep")
    @patch("parser.fetch_article_content")
    def test_enrich_articles_with_content(self, mock_fetch, mock_sleep):
        from parser import enrich_articles_with_content

        mock_fetch.return_value = "文章正文"
        articles = [
            {"title": "文章1", "url": "https://example.com/1"},
            {"title": "文章2", "url": "https://example.com/2"},
        ]
        enrich_articles_with_content(articles)
        self.assertEqual(articles[0]["content"], "文章正文")
        self.assertEqual(articles[1]["content"], "文章正文")
        # 最后一篇之后不 sleep
        self.assertEqual(mock_sleep.call_count, 1)


class TestSummarizer(unittest.TestCase):
    @patch("summarizer.config")
    @patch("summarizer.OpenAI")
    def test_summarize_article_success(self, mock_openai_cls, mock_config):
        from summarizer import summarize_article

        mock_config.KIMI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="这是一篇关于AI的文章。"))
        ]

        result = summarize_article("一篇关于AI发展的长文...")
        self.assertEqual(result, "这是一篇关于AI的文章。")
        mock_client.chat.completions.create.assert_called_once()

    @patch("summarizer.config")
    @patch("summarizer.OpenAI")
    def test_summarize_article_api_error(self, mock_openai_cls, mock_config):
        from summarizer import summarize_article

        mock_config.KIMI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API错误")

        result = summarize_article("文章内容")
        self.assertEqual(result, "")

    def test_summarize_article_empty_content(self):
        from summarizer import summarize_article

        self.assertEqual(summarize_article(""), "")
        self.assertEqual(summarize_article(None), "")

    @patch("summarizer.time.sleep")
    @patch("summarizer.summarize_article")
    @patch("summarizer.config")
    def test_enrich_articles_with_summary(self, mock_config, mock_summarize, mock_sleep):
        from summarizer import enrich_articles_with_summary

        mock_config.KIMI_API_KEY = "test-key"
        mock_config.KIMI_REQUEST_INTERVAL = 2
        mock_summarize.return_value = "AI摘要"

        articles = [
            {"title": "文章1", "content": "内容1"},
            {"title": "文章2", "content": "内容2"},
        ]
        enrich_articles_with_summary(articles)

        self.assertEqual(articles[0]["summary"], "AI摘要")
        self.assertEqual(articles[1]["summary"], "AI摘要")
        self.assertEqual(mock_sleep.call_count, 1)

    @patch("summarizer.summarize_article")
    @patch("summarizer.config")
    def test_enrich_skip_when_no_api_key(self, mock_config, mock_summarize):
        from summarizer import enrich_articles_with_summary

        mock_config.KIMI_API_KEY = ""

        articles = [{"title": "文章1", "content": "内容1"}]
        enrich_articles_with_summary(articles)

        mock_summarize.assert_not_called()
        self.assertNotIn("summary", articles[0])


class TestNotifier(unittest.TestCase):
    def _make_result(self, accounts=None):
        return {
            "fetch_time": "2026-03-04T12:00:00",
            "accounts": accounts or [],
        }

    @patch("notifier.config")
    def test_skip_when_no_webhook(self, mock_config):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = ""
        # 不应抛异常
        notify(self._make_result([{"name": "测试", "articles": []}]))

    @patch("notifier.requests.post")
    @patch("notifier.config")
    def test_skip_when_no_accounts(self, mock_config, mock_post):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        notify(self._make_result([]))
        mock_post.assert_not_called()

    @patch("notifier.requests.post")
    @patch("notifier.config")
    def test_send_card_with_summary(self, mock_config, mock_post):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        mock_post.return_value.raise_for_status = MagicMock()

        result = self._make_result([
            {
                "name": "测试号",
                "articles": [
                    {"title": "文章1", "url": "https://mp.weixin.qq.com/s/1", "summary": "AI摘要1"},
                    {"title": "文章2", "url": "", "summary": ""},
                ],
            },
        ])
        notify(result)

        mock_post.assert_called_once()
        payload = mock_post.call_args[1]["json"]
        self.assertEqual(payload["msg_type"], "interactive")
        card = payload["card"]
        self.assertEqual(card["header"]["title"]["content"], "公众号文章更新")

        elements = card["elements"]
        # 公众号名称 + 文章列表 = 2 个元素
        self.assertEqual(len(elements), 2)
        # 第一个是公众号名称
        self.assertIn("测试号", elements[0]["content"])
        # 第二个是文章 markdown
        articles_md = elements[1]["content"]
        self.assertIn("[文章1]", articles_md)
        self.assertIn("概要：AI摘要1", articles_md)
        # 无摘要的文章不应有概要行
        self.assertNotIn("概要：\n", articles_md)

    @patch("notifier.requests.post")
    @patch("notifier.config")
    def test_send_card_without_summary(self, mock_config, mock_post):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        mock_post.return_value.raise_for_status = MagicMock()

        result = self._make_result([
            {
                "name": "测试号",
                "articles": [
                    {"title": "文章1", "url": "https://example.com"},
                ],
            },
        ])
        notify(result)

        payload = mock_post.call_args[1]["json"]
        articles_md = payload["card"]["elements"][1]["content"]
        self.assertIn("[文章1]", articles_md)
        self.assertNotIn("概要", articles_md)

    @patch("notifier.requests.post")
    @patch("notifier.config")
    def test_send_failure_does_not_raise(self, mock_config, mock_post):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        mock_post.side_effect = Exception("网络错误")

        # 不应抛异常
        result = self._make_result([
            {"name": "测试号", "articles": [{"title": "x", "url": ""}]},
        ])
        notify(result)

    @patch("notifier.requests.post")
    @patch("notifier.config")
    def test_multiple_accounts_with_hr(self, mock_config, mock_post):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        mock_post.return_value.raise_for_status = MagicMock()

        result = self._make_result([
            {"name": "号A", "articles": [{"title": "a1", "url": ""}]},
            {"name": "号B", "articles": [{"title": "b1", "url": ""}]},
        ])
        notify(result)

        elements = mock_post.call_args[1]["json"]["card"]["elements"]
        # 号A名称 + 号A文章 + hr + 号B名称 + 号B文章 = 5
        self.assertEqual(len(elements), 5)
        self.assertEqual(elements[2]["tag"], "hr")


class TestAuth(unittest.TestCase):
    def test_extract_token_success(self):
        from auth import _extract_token

        page = MagicMock()
        page.url = "https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=123456&lang=zh_CN"
        self.assertEqual(_extract_token(page), "123456")

    def test_extract_token_missing(self):
        from auth import _extract_token, AuthError

        page = MagicMock()
        page.url = "https://mp.weixin.qq.com/cgi-bin/home"
        with self.assertRaises(AuthError):
            _extract_token(page)

    def test_extract_cookie_success(self):
        from auth import _extract_cookie

        context = MagicMock()
        context.cookies.return_value = [
            {"name": "sess", "value": "abc"},
            {"name": "token", "value": "xyz"},
        ]
        result = _extract_cookie(context)
        self.assertEqual(result, "sess=abc; token=xyz")

    def test_extract_cookie_empty(self):
        from auth import _extract_cookie, AuthError

        context = MagicMock()
        context.cookies.return_value = []
        with self.assertRaises(AuthError):
            _extract_cookie(context)


if __name__ == "__main__":
    unittest.main()
