from __future__ import annotations

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.storage.database import Base


class Account(Base):
    __tablename__ = 'accounts'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    fakeid = Column(String(255), nullable=True)
    is_selected = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    articles = relationship('Article', back_populates='account')


class Settings(Base):
    __tablename__ = 'settings'

    id = Column(Integer, primary_key=True, index=True)
    feishu_webhook = Column(String(1000), nullable=True)
    article_count = Column(Integer, nullable=False, default=10)
    request_interval = Column(Float, nullable=False, default=4)
    login_status = Column(String(50), nullable=False, default='logged_out')
    last_login_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Batch(Base):
    __tablename__ = 'batches'

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, unique=True)
    status = Column(String(50), nullable=False, default='waiting')
    selected_account_ids = Column(Text, nullable=False, default='[]')
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    total_accounts = Column(Integer, nullable=False, default=0)
    completed_accounts = Column(Integer, nullable=False, default=0)
    total_articles = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    feishu_push_status = Column(String(50), nullable=False, default='not_pushed')
    feishu_pushed_at = Column(DateTime, nullable=True)

    articles = relationship('Article', back_populates='batch')
    events = relationship('TaskEvent', back_populates='batch')


class Article(Base):
    __tablename__ = 'articles'

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey('batches.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(String(2000), nullable=False)
    digest = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    cover_url = Column(String(2000), nullable=True)
    publish_time = Column(String(100), nullable=True)
    article_aid = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch = relationship('Batch', back_populates='articles')
    account = relationship('Account', back_populates='articles')


class TaskEvent(Base):
    __tablename__ = 'task_events'

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey('batches.id'), nullable=False)
    level = Column(String(20), nullable=False, default='info')
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch = relationship('Batch', back_populates='events')
