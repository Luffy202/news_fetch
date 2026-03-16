from __future__ import annotations

import json
import os
import sqlite3
import time
import unittest
from pathlib import Path
from typing import Any, Callable, Iterable

import requests


ROOT_DIR = Path(__file__).resolve().parents[2]
OUTPUT_JSON_PATH = ROOT_DIR / 'output' / 'articles.json'
DB_PATH = ROOT_DIR / 'data' / 'dashboard.db'
DEFAULT_BASE_URL = 'http://127.0.0.1:8000'
DEFAULT_POLL_INTERVAL = 2.0
DEFAULT_BATCH_TIMEOUT = 8 * 60
DEFAULT_REQUEST_TIMEOUT = 30


class E2EEnvironmentError(RuntimeError):
    pass


def get_base_url() -> str:
    return os.getenv('WECHAT_E2E_BASE_URL', DEFAULT_BASE_URL).rstrip('/')


def get_target_account_name() -> str:
    account_name = os.getenv('WECHAT_E2E_ACCOUNT', '').strip()
    if account_name:
        return account_name
    configured_accounts = [item.strip() for item in os.getenv('WECHAT_ACCOUNTS', '').split(',') if item.strip()]
    return configured_accounts[0] if configured_accounts else ''


def api_request(method: str, path: str, expected_status: int | Iterable[int] | None = 200, **kwargs) -> requests.Response:
    timeout = kwargs.pop('timeout', DEFAULT_REQUEST_TIMEOUT)
    url = f'{get_base_url()}{path}'
    try:
        response = requests.request(method, url, timeout=timeout, **kwargs)
    except requests.RequestException as exc:
        raise E2EEnvironmentError(f'请求失败: {method.upper()} {url} -> {exc}') from exc

    if expected_status is None:
        return response

    expected_statuses = {expected_status} if isinstance(expected_status, int) else set(expected_status)
    if response.status_code not in expected_statuses:
        body = response.text[:500]
        raise AssertionError(
            f'接口返回异常: {method.upper()} {path} -> {response.status_code}, 期望 {sorted(expected_statuses)}, 响应: {body}'
        )
    return response


def get_json(path: str, expected_status: int | Iterable[int] | None = 200, **kwargs) -> dict[str, Any]:
    return api_request('GET', path, expected_status=expected_status, **kwargs).json()


def post_json(path: str, payload: dict[str, Any] | None = None, expected_status: int | Iterable[int] | None = 200, **kwargs) -> requests.Response:
    return api_request('POST', path, json=payload, expected_status=expected_status, **kwargs)


def patch_json(path: str, payload: dict[str, Any], expected_status: int | Iterable[int] | None = 200, **kwargs) -> dict[str, Any]:
    return api_request('PATCH', path, json=payload, expected_status=expected_status, **kwargs).json()


def require_service_running() -> None:
    try:
        health = get_json('/health')
    except (AssertionError, E2EEnvironmentError) as exc:
        raise unittest.SkipTest(f'后端服务不可用，请先启动服务: {exc}') from exc
    if health.get('status') != 'ok':
        raise unittest.SkipTest(f'健康检查未通过: {health}')


def get_auth_status() -> dict[str, Any]:
    return get_json('/api/auth/status')


def get_current_task() -> dict[str, Any]:
    return get_json('/api/crawl/current')


def get_settings() -> dict[str, Any]:
    return get_json('/api/settings')


def set_minimal_crawl_settings() -> dict[str, Any]:
    article_count = int(os.getenv('WECHAT_E2E_ARTICLE_COUNT', '1'))
    request_interval = float(os.getenv('WECHAT_E2E_REQUEST_INTERVAL', '4'))
    return patch_json(
        '/api/settings',
        {
            'articleCount': article_count,
            'requestInterval': request_interval,
        },
    )


def restore_settings(settings: dict[str, Any]) -> dict[str, Any]:
    return patch_json(
        '/api/settings',
        {
            'feishuWebhook': settings.get('feishuWebhook'),
            'articleCount': settings.get('articleCount'),
            'requestInterval': settings.get('requestInterval'),
        },
    )


def list_accounts() -> list[dict[str, Any]]:
    response = api_request('GET', '/api/accounts')
    return response.json()


def ensure_target_account_selected() -> dict[str, Any]:
    account_name = get_target_account_name()
    accounts = list_accounts()

    if not account_name:
        selected_account = next((item for item in accounts if item.get('isSelected')), None)
        if selected_account is None:
            raise unittest.SkipTest('请先在后台勾选一个公众号，或设置 WECHAT_E2E_ACCOUNT')
        return selected_account

    account = next((item for item in accounts if item.get('name') == account_name), None)
    if account is None:
        response = post_json(
            '/api/accounts',
            {
                'name': account_name,
                'isSelected': True,
            },
            expected_status=201,
        )
        return response.json()

    if not account.get('isSelected'):
        account = patch_json(
            f"/api/accounts/{account['id']}",
            {
                'isSelected': True,
            },
        )
    return account


def require_logged_in() -> dict[str, Any]:
    status = get_auth_status()
    if status.get('loginStatus') != 'logged_in':
        raise unittest.SkipTest(
            '当前环境未登录，请先完成扫码登录，或单独执行开启登录的 E2E case'
        )
    return status


def poll_until(
    fetcher: Callable[[], Any],
    predicate: Callable[[Any], bool],
    *,
    timeout: float,
    interval: float = DEFAULT_POLL_INTERVAL,
    description: str,
) -> Any:
    deadline = time.time() + timeout
    last_value = None
    while time.time() < deadline:
        last_value = fetcher()
        if predicate(last_value):
            return last_value
        time.sleep(interval)
    raise AssertionError(f'{description} 超时，最后结果: {last_value}')


def wait_for_login_state(states: set[str], timeout: float = 180) -> dict[str, Any]:
    return poll_until(
        get_auth_status,
        lambda status: status.get('loginStatus') in states,
        timeout=timeout,
        interval=DEFAULT_POLL_INTERVAL,
        description=f'等待登录状态变为 {sorted(states)}',
    )


def start_crawl() -> requests.Response:
    return post_json('/api/crawl', expected_status=(202, 400, 409))


def get_batch_detail(batch_id: int) -> dict[str, Any]:
    return get_json(f'/api/batches/{batch_id}')


def list_batches() -> list[dict[str, Any]]:
    response = api_request('GET', '/api/batches')
    return response.json()


def wait_for_batch_terminal(batch_id: int, timeout: float = DEFAULT_BATCH_TIMEOUT) -> dict[str, Any]:
    return poll_until(
        lambda: get_batch_detail(batch_id),
        lambda detail: detail.get('status') in {'completed', 'failed'},
        timeout=timeout,
        interval=DEFAULT_POLL_INTERVAL,
        description=f'等待批次 {batch_id} 结束',
    )


def get_latest_completed_batch_detail() -> dict[str, Any]:
    for batch in list_batches():
        if batch.get('status') == 'completed':
            return get_batch_detail(batch['id'])
    raise unittest.SkipTest('当前没有可用的已完成批次，请先执行真实抓取用例')


def read_output_json() -> dict[str, Any]:
    if not OUTPUT_JSON_PATH.exists():
        raise AssertionError(f'未找到输出文件: {OUTPUT_JSON_PATH}')
    return json.loads(OUTPUT_JSON_PATH.read_text(encoding='utf-8'))


def assert_output_json(testcase: unittest.TestCase, expected_account_name: str | None = None) -> dict[str, Any]:
    payload = read_output_json()
    testcase.assertIn('fetch_time', payload)
    testcase.assertIn('accounts', payload)
    testcase.assertIsInstance(payload['accounts'], list)
    testcase.assertTrue(payload['accounts'], 'output/articles.json 中 accounts 不能为空')
    if expected_account_name:
        testcase.assertTrue(
            any(account.get('name') == expected_account_name for account in payload['accounts']),
            f'output/articles.json 中未找到目标公众号: {expected_account_name}',
        )
    return payload


def get_sqlite_batch_article_counts(batch_id: int) -> dict[str, int]:
    if not DB_PATH.exists():
        raise AssertionError(f'未找到数据库文件: {DB_PATH}')
    connection = sqlite3.connect(DB_PATH)
    try:
        batch_row = connection.execute(
            'select total_accounts, completed_accounts, total_articles from batches where id = ?',
            (batch_id,),
        ).fetchone()
        article_count_row = connection.execute(
            'select count(*) from articles where batch_id = ?',
            (batch_id,),
        ).fetchone()
    finally:
        connection.close()

    if batch_row is None:
        raise AssertionError(f'SQLite 中未找到批次: {batch_id}')

    return {
        'total_accounts': int(batch_row[0]),
        'completed_accounts': int(batch_row[1]),
        'total_articles': int(batch_row[2]),
        'article_rows': int(article_count_row[0] if article_count_row else 0),
    }


def require_cli_credentials() -> dict[str, str]:
    cookie = os.getenv('WECHAT_COOKIE', '').strip()
    token = os.getenv('WECHAT_TOKEN', '').strip()
    account_name = get_target_account_name()
    if not cookie:
        cookie = os.getenv('WECHAT_E2E_COOKIE', '').strip()
    if not token:
        token = os.getenv('WECHAT_E2E_TOKEN', '').strip()
    if (not cookie or not token) and get_auth_status().get('loginStatus') == 'logged_in':
        try:
            from backend.services.wechat_auth import AuthError, get_credentials

            credentials = get_credentials()
            cookie = cookie or credentials['cookie']
            token = token or credentials['token']
        except (AuthError, ImportError):
            pass
    if not cookie or not token:
        raise unittest.SkipTest('CLI 烟测需要设置 WECHAT_COOKIE/WECHAT_TOKEN，或 WECHAT_E2E_COOKIE/WECHAT_E2E_TOKEN')
    if not account_name:
        raise unittest.SkipTest('CLI 烟测需要设置 WECHAT_E2E_ACCOUNT 或 WECHAT_ACCOUNTS')
    return {
        'cookie': cookie,
        'token': token,
        'account_name': account_name,
    }
