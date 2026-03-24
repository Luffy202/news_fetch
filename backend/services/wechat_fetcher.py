from __future__ import annotations

import time

import requests

from backend import runtime_config
from backend.services.errors import NetworkAccessError, ProxyConfigError, WechatAPIError, WechatAuthError

BASE_URL = 'https://mp.weixin.qq.com/cgi-bin'

_cookie = ''
_token = ''
_session = requests.Session()
_session.trust_env = False


def set_credentials(cookie, token):
    global _cookie, _token
    _cookie = cookie
    _token = token


def set_request_session(session: requests.Session | None):
    global _session
    _session = session or requests.Session()
    _session.trust_env = False


def _get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/cgi-bin/appmsg'
        '?t=media/appmsg_edit_v2&action=edit&isNew=1&type=9',
        'Cookie': _cookie,
    }


def _request_json(url, params, *, action_name):
    try:
        resp = _session.get(url, headers=_get_headers(), params=params, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.ProxyError as exc:
        raise ProxyConfigError('代理连接失败，请检查代理地址是否可用') from exc
    except requests.exceptions.Timeout as exc:
        raise NetworkAccessError('网络请求超时，请检查网络或代理配置') from exc
    except requests.exceptions.ConnectionError as exc:
        raise NetworkAccessError('无法连接微信服务，请检查当前网络或代理配置') from exc
    except requests.exceptions.RequestException as exc:
        raise NetworkAccessError('请求微信服务失败，请稍后重试') from exc

    try:
        data = resp.json()
    except ValueError as exc:
        raise WechatAuthError('微信登录状态已失效，请重新扫码登录') from exc

    base_resp = data.get('base_resp', {})
    ret = base_resp.get('ret')
    err_msg = str(base_resp.get('err_msg', '未知错误'))
    if ret != 0:
        lowered_err_msg = err_msg.lower()
        if any(keyword in lowered_err_msg for keyword in ['invalid', 'login', 'auth', 'expired', 'token']):
            raise WechatAuthError('微信登录状态已失效，请重新扫码登录')
        raise WechatAPIError(f'微信接口请求失败：{err_msg}')
    return data


def search_accounts(name, count=5):
    url = f'{BASE_URL}/searchbiz'
    params = {
        'action': 'search_biz',
        'begin': 0,
        'count': count,
        'query': name,
        'token': _token,
        'lang': 'zh_CN',
        'f': 'json',
        'ajax': 1,
    }

    data = _request_json(url, params, action_name='搜索公众号')

    biz_list = data.get('list', [])
    if not biz_list:
        print(f'  未找到公众号: {name}')
        return []

    candidates = [
        {
            'nickname': account.get('nickname') or '',
            'fakeid': account.get('fakeid') or '',
        }
        for account in biz_list
        if account.get('nickname') and account.get('fakeid')
    ]

    for account in candidates:
        print(f"  找到公众号: {account.get('nickname')} (fakeid: {account.get('fakeid')})")
    return candidates


def search_account(name):
    candidates = search_accounts(name)
    if not candidates:
        return None

    exact_match = next((item for item in candidates if item.get('nickname') == name), None)
    account = exact_match or candidates[0]
    return account.get('fakeid')


def get_articles(fakeid, count=10):
    url = f'{BASE_URL}/appmsg'
    params = {
        'action': 'list_ex',
        'begin': 0,
        'count': count,
        'fakeid': fakeid,
        'type': 9,
        'query': '',
        'token': _token,
        'lang': 'zh_CN',
        'f': 'json',
        'ajax': 1,
    }

    data = _request_json(url, params, action_name='获取文章列表')

    articles = []
    for item in data.get('app_msg_list', []):
        articles.append(
            {
                'title': item.get('title', ''),
                'url': item.get('link', ''),
                'digest': item.get('digest', ''),
                'cover': item.get('cover', ''),
                'publish_time': item.get('create_time', 0),
                'aid': item.get('aid', ''),
            }
        )

    return articles


def fetch_account_articles(name, count=10):
    print(f'\n正在处理公众号: {name}')

    fakeid = search_account(name)
    if not fakeid:
        return None

    time.sleep(runtime_config.REQUEST_INTERVAL)

    articles = get_articles(fakeid, count)
    print(f'  获取到 {len(articles)} 篇文章')

    return {
        'name': name,
        'fakeid': fakeid,
        'articles': articles,
    }
