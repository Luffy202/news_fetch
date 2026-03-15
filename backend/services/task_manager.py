from __future__ import annotations

from threading import Lock
from typing import Optional


class TaskManager:
    def __init__(self) -> None:
        self._lock = Lock()
        self._active_batch_id: Optional[int] = None

    def start(self, batch_id: int) -> bool:
        with self._lock:
            if self._active_batch_id is not None:
                return False
            self._active_batch_id = batch_id
            return True

    def finish(self, batch_id: int) -> None:
        with self._lock:
            if self._active_batch_id == batch_id:
                self._active_batch_id = None

    def current(self) -> Optional[int]:
        with self._lock:
            return self._active_batch_id


task_manager = TaskManager()
