from __future__ import annotations

from sqlalchemy.orm import Session

from backend.models.schema import Account
from backend.storage.repositories import AccountRepository


class AccountService:
    def __init__(self, db: Session):
        self.repository = AccountRepository(db)

    def list_accounts(self) -> list[Account]:
        return self.repository.list_all()

    def create_account(self, name: str, is_selected: bool = False) -> Account:
        existing = self.repository.get_by_name(name)
        if existing is not None:
            raise ValueError('该公众号已存在')
        return self.repository.create(name=name, is_selected=is_selected)

    def update_account(self, account_id: int, *, name: str | None = None, is_selected: bool | None = None) -> Account:
        account = self.repository.get(account_id)
        if account is None:
            raise ValueError('公众号不存在')
        if name is not None and name != account.name:
            existing = self.repository.get_by_name(name)
            if existing is not None:
                raise ValueError('该公众号已存在')
            account.name = name
        if is_selected is not None:
            account.is_selected = is_selected
        self.repository.db.commit()
        self.repository.db.refresh(account)
        return account

    def delete_account(self, account_id: int) -> None:
        account = self.repository.get(account_id)
        if account is None:
            raise ValueError('公众号不存在')
        self.repository.delete(account)
