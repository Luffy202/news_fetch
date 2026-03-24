from __future__ import annotations

from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / 'data'
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / 'dashboard.db'
DATABASE_URL = f'sqlite:///{DB_PATH.as_posix()}'

engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    from backend.models.schema import Account, Article, Batch, Settings, TaskEvent  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_settings_columns()


def _ensure_settings_columns() -> None:
    with engine.begin() as connection:
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(settings)"))}
        if 'proxy_url' not in columns:
            connection.execute(text('ALTER TABLE settings ADD COLUMN proxy_url VARCHAR(1000)'))


def get_db():
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()
