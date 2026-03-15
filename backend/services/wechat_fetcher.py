from __future__ import annotations

import time

import requests

from backend import runtime_config

BASE_URL = 'https://mp.weixin.qq.com/cgi-bin'

_cookie = ''
_token = ''


def set_credentials(cookie, token):
    global _cookie, _token
    _cookie = cookie
    _token = token


def _get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/cgi-bin/appmsg'
        '?t=media/appmsg_edit_v2&action=edit&isNew=1&type=9',
        'Cookie': _cookie,
    }


def search_account(name):
    url = f'{BASE_URL}/searchbiz'
    params = {
        'action': 'search_biz',
        'begin': 0,
        'count': 5,
        'query': name,
        'token': _token,
        'lang': 'zh_CN',
        'f': 'json',
        'ajax': 1,
    }

    resp = requests.get(url, headers=_get_headers(), params=params, timeout=10)
    data = resp.json()

    if data.get('base_resp', {}).get('ret') != 0:
        print(f"  搜索失败: {data.get('base_resp', {}).get('err_msg', '未知错误')}")
        return None

    biz_list = data.get('list', [])
    if not biz_list:
        print(f'  未找到公众号: {name}')
        return None

    account = biz_list[0]
    print(f"  找到公众号: {account.get('nickname')} (fakeid: {account.get('fakeid')})")
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

    resp = requests.get(url, headers=_get_headers(), params=params, timeout=10)
    data = resp.json()

    if data.get('base_resp', {}).get('ret') != 0:
        print(f"  获取文章列表失败: {data.get('base_resp', {}).get('err_msg', '未知错误')}")
        return []

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
