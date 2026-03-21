from __future__ import annotations

from sqlalchemy.orm import Session

from backend.storage.repositories import BatchRepository
from backend.services.errors import ConflictError
from backend.services.task_manager import task_manager


RUNNING_CRAWL_MESSAGE = '当前已有爬取任务正在执行'
RUNNING_ACCOUNT_MUTATION_MESSAGE = '当前有抓取任务正在执行，暂不允许修改公众号配置'
EXPORT_COMPLETED_ONLY_MESSAGE = '仅支持导出已完成批次'


def has_running_crawl(db: Session) -> bool:
    repository = BatchRepository(db)
    return repository.get_running() is not None or task_manager.current() is not None


def ensure_no_running_crawl(db: Session, message: str) -> None:
    if has_running_crawl(db):
        raise ConflictError(message)
