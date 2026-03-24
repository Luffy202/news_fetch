from __future__ import annotations

from sqlalchemy.orm import Session

from backend.services.auth_service import AuthService
from backend.services.crawler_service import crawler_service
from backend.services.errors import WechatAuthError
from backend.services.wechat_fetcher import search_accounts
from backend.models.schema import Account
from backend.storage.repositories import AccountRepository
from backend.services.runtime_guard import RUNNING_ACCOUNT_MUTATION_MESSAGE, ensure_no_running_crawl


class AccountService:
    def __init__(self, db: Session):
        self.repository = AccountRepository(db)

    def list_accounts(self) -> list[Account]:
        return self.repository.list_all()

    def _ensure_wechat_credentials(self) -> None:
        auth_service = AuthService(self.repository.db)
        settings = auth_service.settings_service.get_settings()
        if crawler_service.has_credentials():
            return
        if settings.login_status == 'logged_in' and auth_service.restore_credentials():
            return
        raise ValueError('请先完成微信登录')

    def precheck_account(self, name: str) -> dict:
        candidate_name = name.strip()
        if not candidate_name:
            raise ValueError('请输入公众号名称')

        self._ensure_wechat_credentials()
        try:
            candidates = search_accounts(candidate_name, count=5)
        except WechatAuthError:
            AuthService(self.repository.db).mark_expired('微信登录状态已失效，请重新登录后再添加公众号')
            raise ValueError('微信登录状态已失效，请重新登录后再添加公众号') from None

        if not candidates:
            raise ValueError('未找到该公众号，请确认名称是否正确')

        exact_match = next((item for item in candidates if item.get('nickname') == candidate_name), None)
        if exact_match is not None:
            return {
                'status': 'exact_match',
                'exactMatch': {
                    'nickname': exact_match.get('nickname') or candidate_name,
                    'fakeid': exact_match.get('fakeid') or '',
                },
            }

        candidate_items = [
            {
                'nickname': item.get('nickname') or '',
                'fakeid': item.get('fakeid') or '',
            }
            for item in candidates
            if item.get('nickname') and item.get('fakeid')
        ]
        if not candidate_items:
            raise ValueError('未找到该公众号，请确认名称是否正确')

        return {
            'status': 'candidates',
            'candidates': candidate_items,
        }

    def create_account(
        self,
        name: str,
        is_selected: bool = False,
        *,
        fakeid: str | None = None,
        resolved_name: str | None = None,
    ) -> Account:
        ensure_no_running_crawl(self.repository.db, RUNNING_ACCOUNT_MUTATION_MESSAGE)
        final_name = (resolved_name or name).strip()
        if not final_name:
            raise ValueError('请输入公众号名称')

        if fakeid:
            existing_by_fakeid = self.repository.get_by_fakeid(fakeid)
            if existing_by_fakeid is not None:
                raise ValueError('该公众号已存在')

        existing = self.repository.get_by_name(final_name)
        if existing is not None:
            raise ValueError('该公众号已存在')
        return self.repository.create(name=final_name, fakeid=fakeid, is_selected=is_selected)

    def update_account(self, account_id: int, *, name: str | None = None, is_selected: bool | None = None) -> Account:
        ensure_no_running_crawl(self.repository.db, RUNNING_ACCOUNT_MUTATION_MESSAGE)
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
        ensure_no_running_crawl(self.repository.db, RUNNING_ACCOUNT_MUTATION_MESSAGE)
        account = self.repository.get(account_id)
        if account is None:
            raise ValueError('公众号不存在')
        self.repository.delete(account)
