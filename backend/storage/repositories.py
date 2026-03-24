from __future__ import annotations

import json
from datetime import datetime
from typing import Iterable, Optional, Sequence
from sqlalchemy.orm import Session, selectinload

from backend.models.schema import Account, Article, Batch, Settings, TaskEvent


class AccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Account]:
        return self.db.query(Account).order_by(Account.created_at.asc()).all()

    def list_selected(self) -> list[Account]:
        return self.db.query(Account).filter(Account.is_selected.is_(True)).order_by(Account.created_at.asc()).all()

    def list_by_ids(self, account_ids: Sequence[int]) -> list[Account]:
        if not account_ids:
            return []
        return self.db.query(Account).filter(Account.id.in_(account_ids)).order_by(Account.created_at.asc()).all()

    def get(self, account_id: int) -> Optional[Account]:
        return self.db.query(Account).filter(Account.id == account_id).first()

    def get_by_name(self, name: str) -> Optional[Account]:
        return self.db.query(Account).filter(Account.name == name).first()

    def get_by_fakeid(self, fakeid: str) -> Optional[Account]:
        return self.db.query(Account).filter(Account.fakeid == fakeid).first()

    def create(self, name: str, fakeid: str | None = None, is_selected: bool = False) -> Account:
        account = Account(name=name, fakeid=fakeid, is_selected=is_selected)
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def save(self, account: Account) -> Account:
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: Account) -> None:
        self.db.delete(account)
        self.db.commit()


class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_singleton(self) -> Settings:
        settings = self.db.query(Settings).first()
        if settings is None:
            settings = Settings(proxy_url='')
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update(
        self,
        settings: Settings,
        *,
        feishu_webhook: str | None | object = None,
        proxy_url: str | None | object = None,
        article_count: int | None = None,
        request_interval: float | None = None,
        login_status: str | None = None,
        last_login_at: datetime | None | object = None,
    ) -> Settings:
        if feishu_webhook is not None:
            settings.feishu_webhook = feishu_webhook
        if proxy_url is not None:
            settings.proxy_url = proxy_url
        if article_count is not None:
            settings.article_count = article_count
        if request_interval is not None:
            settings.request_interval = request_interval
        if login_status is not None:
            settings.login_status = login_status
        if last_login_at is not None:
            settings.last_login_at = last_login_at
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings


class BatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Batch]:
        return self.db.query(Batch).order_by(Batch.started_at.desc()).all()

    def get(self, batch_id: int) -> Optional[Batch]:
        return (
            self.db.query(Batch)
            .options(selectinload(Batch.articles), selectinload(Batch.events))
            .filter(Batch.id == batch_id)
            .first()
        )

    def get_running(self) -> Optional[Batch]:
        return self.db.query(Batch).filter(Batch.status == 'running').first()

    def create(self, batch_no: str, selected_account_ids: Sequence[int], total_accounts: int) -> Batch:
        batch = Batch(
            batch_no=batch_no,
            status='waiting',
            selected_account_ids=json.dumps(list(selected_account_ids), ensure_ascii=False),
            total_accounts=total_accounts,
            completed_accounts=0,
            total_articles=0,
        )
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def update(self, batch: Batch, **fields) -> Batch:
        for key, value in fields.items():
            setattr(batch, key, value)
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def add_event(self, batch_id: int, message: str, level: str = 'info') -> TaskEvent:
        event = TaskEvent(batch_id=batch_id, message=message, level=level)
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete_related_records(self, batch_id: int) -> None:
        self.db.query(Article).filter(Article.batch_id == batch_id).delete(synchronize_session=False)
        self.db.query(TaskEvent).filter(TaskEvent.batch_id == batch_id).delete(synchronize_session=False)
        self.db.commit()

    def delete(self, batch: Batch) -> None:
        self.db.delete(batch)
        self.db.commit()


class ArticleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_batch(self, batch_id: int) -> list[Article]:
        return self.db.query(Article).filter(Article.batch_id == batch_id).order_by(Article.created_at.asc()).all()

    def add_many(self, articles: Iterable[Article]) -> None:
        self.db.add_all(list(articles))
        self.db.commit()
