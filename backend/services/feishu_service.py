from __future__ import annotations

from datetime import datetime
import logging

import requests
from sqlalchemy.orm import Session

from backend.storage.repositories import AccountRepository, BatchRepository, SettingsRepository

logger = logging.getLogger(__name__)


def build_accounts_payload(accounts: list[dict]) -> dict:
    elements: list[dict] = []
    for index, account in enumerate(accounts):
        account_name = account.get('name') or '未知公众号'
        elements.append({'tag': 'markdown', 'content': f'**【{account_name}】**'})
        lines = []
        for line_index, article in enumerate(account.get('articles', []), start=1):
            title = article.get('title') or '无标题'
            url = article.get('url') or ''
            summary = article.get('summary') or article.get('digest') or ''
            line = f'{line_index}. [{title}]({url})' if url else f'{line_index}. {title}'
            if summary:
                line += f'\n概要：{summary}'
            lines.append(line)
        if lines:
            elements.append({'tag': 'markdown', 'content': '\n'.join(lines)})
        if index < len(accounts) - 1:
            elements.append({'tag': 'hr'})

    return {
        'msg_type': 'interactive',
        'card': {
            'header': {
                'title': {'tag': 'plain_text', 'content': '公众号文章更新'},
                'template': 'blue',
            },
            'elements': elements,
        },
    }


def push_accounts(webhook: str, accounts: list[dict]) -> None:
    payload = build_accounts_payload(accounts)
    response = requests.post(webhook, json=payload, timeout=10)
    response.raise_for_status()


class FeishuService:
    def __init__(self, db: Session):
        self.db = db
        self.batch_repository = BatchRepository(db)
        self.account_repository = AccountRepository(db)
        self.settings_repository = SettingsRepository(db)

    def push_batch(self, batch_id: int) -> dict:
        logger.info('开始飞书推送: batch_id=%s', batch_id)
        settings = self.settings_repository.get_singleton()
        webhook = (settings.feishu_webhook or '').strip()
        if not webhook:
            raise ValueError('请先在设置中填写飞书 Webhook')

        batch = self.batch_repository.get(batch_id)
        if batch is None:
            raise ValueError('批次不存在')
        if batch.status != 'completed':
            raise ValueError('仅支持推送已完成的批次')
        if not batch.articles:
            raise ValueError('该批次暂无可推送文章')

        try:
            push_accounts(webhook, self.serialize_accounts(batch))
        except Exception as exc:
            self.batch_repository.update(batch, feishu_push_status='failed')
            self.batch_repository.add_event(batch.id, f'飞书推送失败: {exc}', 'error')
            logger.warning('飞书推送失败: batch_id=%s, error=%s', batch_id, exc)
            raise ValueError(f'飞书推送失败: {exc}') from exc

        pushed_at = datetime.utcnow()
        batch = self.batch_repository.update(
            batch,
            feishu_push_status='pushed',
            feishu_pushed_at=pushed_at,
        )
        self.batch_repository.add_event(batch.id, '飞书推送成功')
        logger.info('飞书推送成功: batch_id=%s', batch_id)
        return {
            'batchId': batch.id,
            'feishuPushStatus': batch.feishu_push_status,
            'feishuPushedAt': batch.feishu_pushed_at.isoformat() if batch.feishu_pushed_at else None,
            'message': '飞书推送成功',
        }

    def serialize_accounts(self, batch) -> list[dict]:
        articles_by_account_id: dict[int, list] = {}
        for article in batch.articles:
            articles_by_account_id.setdefault(article.account_id, []).append(article)

        sorted_accounts = sorted(batch.articles, key=lambda item: (item.account_id, item.id))
        used_account_ids: list[int] = []
        for article in sorted_accounts:
            if article.account_id not in used_account_ids:
                used_account_ids.append(article.account_id)

        accounts = self.account_repository.list_by_ids(used_account_ids)
        account_lookup = {account.id: account.name for account in accounts}
        payload_accounts = []
        for account_id in used_account_ids:
            payload_accounts.append(
                {
                    'name': account_lookup.get(account_id) or f'公众号 {account_id}',
                    'articles': [
                        {
                            'title': article.title,
                            'url': article.url,
                            'summary': article.summary,
                            'digest': article.digest,
                        }
                        for article in articles_by_account_id.get(account_id, [])
                    ],
                }
            )
        return payload_accounts

    def build_payload(self, batch) -> dict:
        return build_accounts_payload(self.serialize_accounts(batch))
