from __future__ import annotations

from threading import Lock
from typing import Any
from typing import Optional


class TaskManager:
    def __init__(self) -> None:
        self._lock = Lock()
        self._active_task: Optional[dict[str, Any]] = None

    def start(self, batch_id: int, account_names: list[str] | None = None) -> bool:
        with self._lock:
            if self._active_task is not None:
                return False
            self._active_task = {
                'batch_id': batch_id,
                'currentAccountName': None,
                'pendingAccounts': list(account_names or []),
            }
            return True

    def update(
        self,
        batch_id: int,
        *,
        current_account_name: str | None = None,
        pending_accounts: list[str] | None = None,
    ) -> None:
        with self._lock:
            if self._active_task is None or self._active_task['batch_id'] != batch_id:
                return
            if current_account_name is not None:
                self._active_task['currentAccountName'] = current_account_name
            if pending_accounts is not None:
                self._active_task['pendingAccounts'] = list(pending_accounts)

    def finish(self, batch_id: int) -> None:
        with self._lock:
            if self._active_task is not None and self._active_task['batch_id'] == batch_id:
                self._active_task = None

    def current(self) -> Optional[int]:
        with self._lock:
            if self._active_task is None:
                return None
            return self._active_task['batch_id']

    def snapshot(self, batch_id: int) -> dict[str, Any]:
        with self._lock:
            if self._active_task is None or self._active_task['batch_id'] != batch_id:
                return {}
            return {
                'currentAccountName': self._active_task['currentAccountName'],
                'pendingAccounts': list(self._active_task['pendingAccounts']),
            }


task_manager = TaskManager()
