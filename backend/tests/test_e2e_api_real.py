from __future__ import annotations

import os
import threading
import unittest
from io import BytesIO
from zipfile import ZipFile

from backend.tests.e2e_helpers import (
    api_request,
    assert_output_json,
    ensure_target_account_selected,
    get_auth_status,
    get_batch_detail,
    get_current_task,
    get_latest_completed_batch_detail,
    get_settings,
    get_sqlite_batch_article_counts,
    patch_json,
    require_logged_in,
    require_service_running,
    restore_settings,
    set_minimal_crawl_settings,
    start_crawl,
    wait_for_batch_terminal,
    wait_for_login_state,
)


class TestRealApiSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_service_running()
        cls.original_settings = get_settings()

    @classmethod
    def tearDownClass(cls):
        restore_settings(cls.original_settings)

    def test_real_smoke_health(self):
        health = api_request('GET', '/health').json()
        auth_status = get_auth_status()
        current_task = get_current_task()

        self.assertEqual(health, {'status': 'ok'})
        self.assertIn('loginStatus', auth_status)
        self.assertIn(auth_status['loginStatus'], {'logged_out', 'logging_in', 'logged_in'})
        self.assertEqual(current_task['status'], 'idle')
        self.assertEqual(current_task['currentBatchId'], None)

    def test_real_smoke_single_account_crawl(self):
        require_logged_in()
        target_account = ensure_target_account_selected()
        set_minimal_crawl_settings()

        start_response = start_crawl()
        if start_response.status_code != 202:
            self.fail(f"启动抓取失败: {start_response.status_code} {start_response.text}")

        task_payload = start_response.json()
        batch_id = task_payload['currentBatchId']
        self.assertEqual(task_payload['status'], 'running')
        self.assertGreater(batch_id, 0)

        batch_detail = wait_for_batch_terminal(batch_id)
        self.assertEqual(batch_detail['status'], 'completed')
        self.assertEqual(batch_detail['completedAccounts'], batch_detail['totalAccounts'])
        self.assertGreater(batch_detail['totalArticles'], 0)
        self.assertTrue(batch_detail['articles'])

        sqlite_counts = get_sqlite_batch_article_counts(batch_id)
        self.assertEqual(sqlite_counts['total_accounts'], batch_detail['totalAccounts'])
        self.assertEqual(sqlite_counts['completed_accounts'], batch_detail['completedAccounts'])
        self.assertEqual(sqlite_counts['total_articles'], batch_detail['totalArticles'])
        self.assertGreater(sqlite_counts['article_rows'], 0)

        output_payload = assert_output_json(self, target_account['name'])
        self.assertTrue(output_payload['accounts'])


class TestRealApiFullFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_service_running()
        cls.original_settings = get_settings()
        cls.cached_batch_detail = None

    @classmethod
    def tearDownClass(cls):
        restore_settings(cls.original_settings)

    def _ensure_completed_batch(self):
        if self.__class__.cached_batch_detail is not None:
            return self.__class__.cached_batch_detail

        try:
            batch_detail = get_latest_completed_batch_detail()
        except unittest.SkipTest:
            require_logged_in()
            ensure_target_account_selected()
            set_minimal_crawl_settings()
            start_response = start_crawl()
            if start_response.status_code != 202:
                self.fail(f"启动抓取失败: {start_response.status_code} {start_response.text}")
            batch_detail = wait_for_batch_terminal(start_response.json()['currentBatchId'])

        self.assertEqual(batch_detail['status'], 'completed')
        self.assertTrue(batch_detail['articles'])
        self.__class__.cached_batch_detail = batch_detail
        return batch_detail

    def test_real_full_login_if_needed(self):
        if os.getenv('WECHAT_E2E_ENABLE_LOGIN', '').strip() != '1':
            self.skipTest('未开启人工扫码登录 E2E；设置 WECHAT_E2E_ENABLE_LOGIN=1 后再执行')

        current_status = get_auth_status()
        if current_status.get('loginStatus') == 'logged_in':
            self.assertIsNotNone(current_status.get('lastLoginAt'))
            return

        result: dict[str, object] = {}

        def trigger_login_request():
            try:
                result['response'] = api_request(
                    'POST',
                    '/api/auth/login',
                    expected_status=(202, 400),
                    timeout=180,
                )
            except Exception as exc:  # pragma: no cover - 真实环境线程异常透传
                result['exception'] = exc

        thread = threading.Thread(target=trigger_login_request, daemon=True)
        thread.start()

        interim_status = wait_for_login_state({'logging_in', 'logged_in'}, timeout=20)
        self.assertIn(interim_status['loginStatus'], {'logging_in', 'logged_in'})

        final_status = wait_for_login_state({'logged_in', 'logged_out'}, timeout=180)
        thread.join(timeout=5)

        if 'exception' in result:
            raise result['exception']

        response = result.get('response')
        if response is not None and response.status_code == 400:
            self.fail(f'扫码登录失败: {response.text}')

        self.assertEqual(final_status['loginStatus'], 'logged_in')
        self.assertIsNotNone(final_status['lastLoginAt'])

    def test_real_full_exports(self):
        batch_detail = self._ensure_completed_batch()
        article = batch_detail['articles'][0]

        markdown_response = api_request('GET', f"/api/articles/{article['id']}/markdown")
        markdown_text = markdown_response.content.decode('utf-8')
        self.assertEqual(markdown_response.status_code, 200)
        self.assertIn(article['title'], markdown_text)
        self.assertIn('## 正文', markdown_text)
        self.assertIn('原文链接', markdown_text)

        zip_response = api_request('GET', f"/api/batches/{batch_detail['id']}/markdown-export")
        self.assertEqual(zip_response.status_code, 200)
        self.assertGreater(len(zip_response.content), 0)

        with ZipFile(BytesIO(zip_response.content)) as zip_file:
            zip_names = zip_file.namelist()
            self.assertTrue(zip_names)
            self.assertTrue(any(name.endswith('.md') for name in zip_names))

    def test_real_extended_concurrent_guard(self):
        require_logged_in()
        ensure_target_account_selected()
        set_minimal_crawl_settings()

        first_response = start_crawl()
        if first_response.status_code != 202:
            self.fail(f"首次启动抓取失败: {first_response.status_code} {first_response.text}")

        batch_id = first_response.json()['currentBatchId']
        try:
            second_response = start_crawl()
            self.assertEqual(second_response.status_code, 409)
            self.assertIn('当前已有爬取任务正在执行', second_response.text)
        finally:
            wait_for_batch_terminal(batch_id)

    def test_real_extended_degraded_content_visibility(self):
        batch_detail = self._ensure_completed_batch()
        degraded_articles = [
            article for article in batch_detail['articles']
            if isinstance(article.get('content'), str)
            and (
                article['content'].startswith('[抓取失败:')
                or article['content'] == '[无法解析正文内容]'
            )
        ]

        self.assertEqual(batch_detail['status'], 'completed')
        self.assertGreater(batch_detail['totalArticles'], 0)
        self.assertTrue(all(isinstance(article.get('content'), str) and article.get('content') for article in batch_detail['articles']))
        if degraded_articles:
            self.assertTrue(all(article.get('content') for article in degraded_articles))
