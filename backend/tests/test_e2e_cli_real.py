from __future__ import annotations

import os
import subprocess
import sys
import unittest

from backend.tests.e2e_helpers import assert_output_json, require_cli_credentials


class TestRealCliSmoke(unittest.TestCase):
    def test_real_cli_smoke(self):
        credentials = require_cli_credentials()
        env = os.environ.copy()
        env.update(
            {
                'WECHAT_COOKIE': credentials['cookie'],
                'WECHAT_TOKEN': credentials['token'],
                'WECHAT_ACCOUNTS': credentials['account_name'],
                'ARTICLE_COUNT': os.getenv('WECHAT_E2E_ARTICLE_COUNT', '1'),
                'REQUEST_INTERVAL': os.getenv('WECHAT_E2E_REQUEST_INTERVAL', '4'),
                'FEISHU_WEBHOOK': '',
            }
        )

        result = subprocess.run(
            [sys.executable, 'main.py'],
            cwd='/Users/luffylu/Documents/news_fetch',
            env=env,
            capture_output=True,
            text=True,
            timeout=8 * 60,
            check=False,
        )

        if result.returncode != 0:
            self.fail(
                'CLI 真实烟测失败\n'
                f'stdout:\n{result.stdout}\n\n'
                f'stderr:\n{result.stderr}'
            )

        payload = assert_output_json(self, credentials['account_name'])
        self.assertIn('fetch_time', payload)
        self.assertTrue(payload['accounts'])
