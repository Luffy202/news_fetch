from __future__ import annotations

import json
from datetime import datetime
import logging
from threading import Thread
from sqlalchemy.orm import Session

from backend.models.schema import Article
from backend.storage.database import SessionLocal
from backend.storage.repositories import AccountRepository, ArticleRepository, BatchRepository
from backend.services.crawler_service import crawler_service
from backend.services.settings_service import SettingsService
from backend.services.task_manager import task_manager

logger = logging.getLogger(__name__)


class BatchService:
    def __init__(self, db: Session):
        self.db = db
        self.account_repository = AccountRepository(db)
        self.settings_service = SettingsService(db)
        self.batch_repository = BatchRepository(db)
        self.article_repository = ArticleRepository(db)

    def start_crawl(self) -> dict:
        logger.info('准备启动爬取任务')
        running_batch = self.batch_repository.get_running()
        if running_batch is not None or task_manager.current() is not None:
            raise ValueError('当前已有爬取任务正在执行')

        selected_accounts = self.account_repository.list_selected()
        if not selected_accounts:
            raise ValueError('请至少勾选一个公众号')

        settings = self.settings_service.get_settings()
        batch = self.batch_repository.create(
            batch_no=datetime.utcnow().strftime('batch-%Y%m%d%H%M%S'),
            selected_account_ids=[account.id for account in selected_accounts],
            total_accounts=len(selected_accounts),
        )
        if not task_manager.start(batch.id):
            self.batch_repository.update(batch, status='failed', error_message='当前已有爬取任务正在执行')
            raise ValueError('当前已有爬取任务正在执行')

        batch = self.batch_repository.update(batch, status='running', started_at=datetime.utcnow(), error_message=None)
        self.batch_repository.add_event(batch.id, '开始执行爬取任务')
        logger.info('爬取任务已启动: batch_id=%s, accounts=%s', batch.id, len(selected_accounts))

        thread = Thread(target=run_batch_job, args=(batch.id,), daemon=True)
        thread.start()
        return self.serialize_task(batch)

    def get_current_task(self) -> dict:
        running_batch = self.batch_repository.get_running()
        if running_batch is None:
            return {
                'currentBatchId': None,
                'status': 'idle',
                'message': '当前无执行中的爬取任务',
                'events': [],
            }
        batch = self.batch_repository.get(running_batch.id)
        if batch is None:
            return {
                'currentBatchId': None,
                'status': 'idle',
                'message': '当前无执行中的爬取任务',
                'events': [],
            }
        return self.serialize_task(batch)

    def list_batches(self) -> list[dict]:
        return [self.serialize_batch(batch) for batch in self.batch_repository.list_all()]

    def get_batch_detail(self, batch_id: int) -> dict:
        batch = self.batch_repository.get(batch_id)
        if batch is None:
            raise ValueError('批次不存在')
        return self.serialize_batch_detail(batch)

    def serialize_task(self, batch) -> dict:
        detailed_batch = self.batch_repository.get(batch.id)
        if detailed_batch is None:
            return {
                'currentBatchId': batch.id,
                'status': batch.status,
                'message': batch.error_message or '',
                'events': [],
            }
        return {
            'currentBatchId': detailed_batch.id,
            'status': detailed_batch.status,
            'message': detailed_batch.error_message or '',
            'totalAccounts': detailed_batch.total_accounts,
            'completedAccounts': detailed_batch.completed_accounts,
            'totalArticles': detailed_batch.total_articles,
            'startedAt': detailed_batch.started_at.isoformat() if detailed_batch.started_at else None,
            'finishedAt': detailed_batch.finished_at.isoformat() if detailed_batch.finished_at else None,
            'events': [
                {
                    'id': event.id,
                    'level': event.level,
                    'message': event.message,
                    'createdAt': event.created_at.isoformat(),
                }
                for event in detailed_batch.events
            ],
        }

    def serialize_batch(self, batch) -> dict:
        return {
            'id': batch.id,
            'batchNo': batch.batch_no,
            'status': batch.status,
            'totalAccounts': batch.total_accounts,
            'completedAccounts': batch.completed_accounts,
            'totalArticles': batch.total_articles,
            'startedAt': batch.started_at.isoformat() if batch.started_at else None,
            'finishedAt': batch.finished_at.isoformat() if batch.finished_at else None,
            'feishuPushStatus': batch.feishu_push_status,
            'feishuPushedAt': batch.feishu_pushed_at.isoformat() if batch.feishu_pushed_at else None,
        }

    def serialize_batch_detail(self, batch) -> dict:
        account_ids = json.loads(batch.selected_account_ids or '[]')
        accounts = self.account_repository.list_by_ids(account_ids)
        return {
            **self.serialize_batch(batch),
            'selectedAccountIds': account_ids,
            'selectedAccounts': [
                {
                    'id': account.id,
                    'name': account.name,
                    'fakeid': account.fakeid,
                    'isSelected': account.is_selected,
                }
                for account in accounts
            ],
            'errorMessage': batch.error_message,
            'articles': [
                {
                    'id': article.id,
                    'title': article.title,
                    'url': article.url,
                    'digest': article.digest,
                    'summary': article.summary,
                    'content': article.content,
                    'publishTime': article.publish_time,
                    'accountId': article.account_id,
                }
                for article in batch.articles
            ],
            'events': [
                {
                    'id': event.id,
                    'level': event.level,
                    'message': event.message,
                    'createdAt': event.created_at.isoformat(),
                }
                for event in batch.events
            ],
        }


def run_batch_job(batch_id: int) -> None:
    logger.info('后台爬取线程开始: batch_id=%s', batch_id)
    db = SessionLocal()
    batch_repository = BatchRepository(db)
    article_repository = ArticleRepository(db)
    account_repository = AccountRepository(db)
    settings_service = SettingsService(db)
    try:
        batch = batch_repository.get(batch_id)
        if batch is None:
            return
        account_ids = json.loads(batch.selected_account_ids or '[]')
        selected_accounts = account_repository.list_by_ids(account_ids)
        settings = settings_service.get_settings()
        crawler_service.apply_runtime_settings(settings.request_interval)
        logger.info('开始抓取公众号: batch_id=%s, article_count=%s', batch_id, settings.article_count)
        results = crawler_service.crawl_accounts([account.name for account in selected_accounts], settings.article_count)
        total_articles = 0
        completed_accounts = 0
        for account in selected_accounts:
            matched_result = next((item for item in results if item.get('name') == account.name), None)
            if matched_result is None:
                batch_repository.add_event(batch.id, f'公众号 {account.name} 未抓取到文章', 'warning')
                completed_accounts += 1
                batch = batch_repository.update(batch, completed_accounts=completed_accounts, total_articles=total_articles)
                continue
            if matched_result.get('fakeid'):
                account.fakeid = matched_result['fakeid']
                account_repository.save(account)
            article_rows = []
            for article in matched_result.get('articles', []):
                article_rows.append(
                    Article(
                        batch_id=batch.id,
                        account_id=account.id,
                        title=article.get('title') or '',
                        url=article.get('url') or '',
                        digest=article.get('digest'),
                        summary=article.get('summary'),
                        content=article.get('content'),
                        cover_url=article.get('cover'),
                        publish_time=str(article.get('publish_time') or ''),
                        article_aid=article.get('aid'),
                    )
                )
            if article_rows:
                article_repository.add_many(article_rows)
            total_articles += len(article_rows)
            completed_accounts += 1
            batch = batch_repository.update(batch, completed_accounts=completed_accounts, total_articles=total_articles)
            batch_repository.add_event(batch.id, f'公众号 {account.name} 抓取完成，共 {len(article_rows)} 篇')

        batch_repository.update(
            batch,
            status='completed',
            finished_at=datetime.utcnow(),
            total_articles=total_articles,
            completed_accounts=batch.total_accounts,
            error_message=None,
        )
        batch_repository.add_event(batch.id, '爬取任务完成')
        logger.info('爬取任务完成: batch_id=%s, total_articles=%s', batch_id, total_articles)
    except Exception as exc:
        logger.exception('爬取任务失败: batch_id=%s', batch_id)
        batch = batch_repository.get(batch_id)
        if batch is not None:
            batch_repository.update(
                batch,
                status='failed',
                finished_at=datetime.utcnow(),
                error_message=str(exc),
            )
            batch_repository.add_event(batch.id, f'爬取任务失败: {exc}', 'error')
    finally:
        task_manager.finish(batch_id)
        db.close()
