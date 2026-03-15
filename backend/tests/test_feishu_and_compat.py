import unittest
from unittest.mock import patch


class TestFeishuCompatibility(unittest.TestCase):
    def _make_result(self, accounts=None):
        return {
            'fetch_time': '2026-03-04T12:00:00',
            'accounts': accounts or [],
        }

    def test_build_accounts_payload(self):
        from backend.services.feishu_service import build_accounts_payload

        payload = build_accounts_payload([
            {
                'name': '测试号',
                'articles': [
                    {'title': '文章1', 'url': 'https://mp.weixin.qq.com/s/1', 'summary': 'AI摘要1'},
                    {'title': '文章2', 'url': '', 'summary': ''},
                ],
            }
        ])
        self.assertEqual(payload['msg_type'], 'interactive')
        elements = payload['card']['elements']
        self.assertEqual(len(elements), 2)
        self.assertIn('测试号', elements[0]['content'])
        self.assertIn('概要：AI摘要1', elements[1]['content'])

    @patch('notifier.push_accounts')
    @patch('notifier.runtime_config')
    def test_notifier_uses_backend_payload(self, mock_config, mock_push):
        from notifier import notify

        mock_config.FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
        accounts = [{'name': '测试号', 'articles': [{'title': '文章1', 'url': 'https://example.com'}]}]
        notify(self._make_result(accounts))
        mock_push.assert_called_once_with(mock_config.FEISHU_WEBHOOK, accounts)


class TestAuthCompatibility(unittest.TestCase):
    def test_extract_token_success(self):
        from auth import _extract_token

        page = MagicMock()
        page.url = 'https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=123456&lang=zh_CN'
        self.assertEqual(_extract_token(page), '123456')

    def test_extract_cookie_success(self):
        from auth import _extract_cookie

        context = MagicMock()
        context.cookies.return_value = [
            {'name': 'sess', 'value': 'abc'},
            {'name': 'token', 'value': 'xyz'},
        ]
        self.assertEqual(_extract_cookie(context), 'sess=abc; token=xyz')


if __name__ == '__main__':
    unittest.main()
