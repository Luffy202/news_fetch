from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.schema import Account, Article, Batch


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self) -> dict:
        total_accounts = self.db.query(func.count(Account.id)).scalar() or 0
        selected_accounts = self.db.query(func.count(Account.id)).filter(Account.is_selected.is_(True)).scalar() or 0
        total_articles = self.db.query(func.count(Article.id)).scalar() or 0
        total_batches = self.db.query(func.count(Batch.id)).scalar() or 0
        successful_batches = self.db.query(func.count(Batch.id)).filter(Batch.status == 'completed').scalar() or 0
        failed_batches = self.db.query(func.count(Batch.id)).filter(Batch.status == 'failed').scalar() or 0
        latest_batch = self.db.query(Batch).order_by(Batch.started_at.desc()).first()

        batch_status_distribution = [
            {
                'label': status,
                'value': count,
            }
            for status, count in (
                self.db.query(Batch.status, func.count(Batch.id))
                .group_by(Batch.status)
                .order_by(Batch.status.asc())
                .all()
            )
        ]

        account_article_distribution = [
            {
                'label': name,
                'value': count,
            }
            for name, count in (
                self.db.query(Account.name, func.count(Article.id))
                .outerjoin(Article, Article.account_id == Account.id)
                .group_by(Account.id, Account.name)
                .order_by(func.count(Article.id).desc(), Account.created_at.asc())
                .all()
            )
        ]

        return {
            'totalAccounts': total_accounts,
            'selectedAccounts': selected_accounts,
            'totalArticles': total_articles,
            'totalBatches': total_batches,
            'successfulBatches': successful_batches,
            'failedBatches': failed_batches,
            'latestCrawlAt': latest_batch.started_at.isoformat() if latest_batch and latest_batch.started_at else None,
            'batchStatusDistribution': batch_status_distribution,
            'accountArticleDistribution': account_article_distribution,
        }
