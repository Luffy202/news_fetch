#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any

BASE_URL = 'http://127.0.0.1:8000'


def emit(payload: dict[str, Any], *, exit_code: int = 0) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
    sys.stdout.write('\n')
    raise SystemExit(exit_code)


def request_json(path: str, *, method: str = 'GET', body: dict[str, Any] | None = None) -> Any:
    data = None
    headers = {}
    if body is not None:
      data = json.dumps(body, ensure_ascii=False).encode('utf-8')
      headers['Content-Type'] = 'application/json'

    request = urllib.request.Request(
        f'{BASE_URL}{path}',
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read().decode('utf-8')
            if not raw:
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode('utf-8', errors='replace')
        detail = f'请求失败（{exc.code}）'
        try:
            payload = json.loads(raw)
            if isinstance(payload, dict) and payload.get('detail'):
                detail = str(payload['detail'])
        except json.JSONDecodeError:
            if raw.strip():
                detail = raw.strip()
        emit({'error': detail, 'status_code': exc.code}, exit_code=1)
    except urllib.error.URLError as exc:
        emit({'error': f'本地接口不可达: {exc.reason}'}, exit_code=1)
    except json.JSONDecodeError:
        emit({'error': '接口返回非 JSON 数据'}, exit_code=1)


def cmd_health(_args: argparse.Namespace) -> None:
    emit(request_json('/health'))


def cmd_auth_status(_args: argparse.Namespace) -> None:
    emit(request_json('/api/auth/status'))


def cmd_auth_login(args: argparse.Namespace) -> None:
    emit(request_json('/api/auth/login', method='POST', body={'force': bool(args.force)}))


def cmd_accounts_list(_args: argparse.Namespace) -> None:
    emit({'accounts': request_json('/api/accounts')})


def cmd_accounts_precheck(args: argparse.Namespace) -> None:
    emit(request_json('/api/accounts/precheck', method='POST', body={'name': args.name}))


def cmd_accounts_create(args: argparse.Namespace) -> None:
    payload: dict[str, Any] = {
        'name': args.name,
        'resolvedName': args.resolved_name,
        'fakeid': args.fakeid,
        'isSelected': bool(args.selected),
    }
    emit(request_json('/api/accounts', method='POST', body=payload))


def parse_bool(value: str) -> bool:
    lowered = value.strip().lower()
    if lowered in {'1', 'true', 'yes', 'y', 'on'}:
        return True
    if lowered in {'0', 'false', 'no', 'n', 'off'}:
        return False
    raise argparse.ArgumentTypeError('expected true/false')


def cmd_accounts_toggle(args: argparse.Namespace) -> None:
    emit(
        request_json(
            f'/api/accounts/{args.id}',
            method='PATCH',
            body={'isSelected': args.selected},
        )
    )


def cmd_crawl_start(_args: argparse.Namespace) -> None:
    emit(request_json('/api/crawl', method='POST'))


def cmd_crawl_current(_args: argparse.Namespace) -> None:
    emit(request_json('/api/crawl/current'))


def cmd_batches_list(_args: argparse.Namespace) -> None:
    emit({'batches': request_json('/api/batches')})


def cmd_batches_detail(args: argparse.Namespace) -> None:
    emit(request_json(f'/api/batches/{args.id}'))


def cmd_batches_push_feishu(args: argparse.Namespace) -> None:
    emit(request_json(f'/api/batches/{args.id}/feishu-push', method='POST'))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='News Fetch local API client')
    subparsers = parser.add_subparsers(dest='command', required=True)

    subparsers.add_parser('health').set_defaults(func=cmd_health)
    subparsers.add_parser('auth-status').set_defaults(func=cmd_auth_status)

    auth_login = subparsers.add_parser('auth-login')
    auth_login.add_argument('--force', action='store_true')
    auth_login.set_defaults(func=cmd_auth_login)

    subparsers.add_parser('accounts-list').set_defaults(func=cmd_accounts_list)

    accounts_precheck = subparsers.add_parser('accounts-precheck')
    accounts_precheck.add_argument('--name', required=True)
    accounts_precheck.set_defaults(func=cmd_accounts_precheck)

    accounts_create = subparsers.add_parser('accounts-create')
    accounts_create.add_argument('--name', required=True)
    accounts_create.add_argument('--resolved-name', required=True)
    accounts_create.add_argument('--fakeid', required=True)
    accounts_create.add_argument('--selected', action='store_true')
    accounts_create.set_defaults(func=cmd_accounts_create)

    accounts_toggle = subparsers.add_parser('accounts-toggle')
    accounts_toggle.add_argument('--id', required=True, type=int)
    accounts_toggle.add_argument('--selected', required=True, type=parse_bool)
    accounts_toggle.set_defaults(func=cmd_accounts_toggle)

    subparsers.add_parser('crawl-start').set_defaults(func=cmd_crawl_start)
    subparsers.add_parser('crawl-current').set_defaults(func=cmd_crawl_current)
    subparsers.add_parser('batches-list').set_defaults(func=cmd_batches_list)

    batches_detail = subparsers.add_parser('batches-detail')
    batches_detail.add_argument('--id', required=True, type=int)
    batches_detail.set_defaults(func=cmd_batches_detail)

    batches_push = subparsers.add_parser('batches-push-feishu')
    batches_push.add_argument('--id', required=True, type=int)
    batches_push.set_defaults(func=cmd_batches_push_feishu)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
