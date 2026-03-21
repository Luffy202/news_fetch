from __future__ import annotations

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.accounts import router as accounts_router
from backend.api.auth import router as auth_router
from backend.api.crawl import router as crawl_router
from backend.api.deps import get_db
from backend.models.schema import Account, Batch, Settings
from backend.services.auth_state import DEFAULT_AUTH_MESSAGES, auth_state_manager
from backend.services.runtime_guard import RUNNING_ACCOUNT_MUTATION_MESSAGE, RUNNING_CRAWL_MESSAGE
from backend.storage.database import Base


class TestRuntimeGuards(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.seed_db = self.session_factory()

        account = Account(name='测试公众号', fakeid='fakeid-1', is_selected=True)
        settings = Settings(login_status='logged_in')
        batch = Batch(batch_no='RUNNING-001', status='running', selected_account_ids='[1]', total_accounts=1)
        self.seed_db.add_all([account, settings, batch])
        self.seed_db.commit()
        self.account_id = account.id

        app = FastAPI()
        app.include_router(accounts_router)
        app.include_router(auth_router)
        app.include_router(crawl_router)

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        self.original_message = auth_state_manager._message
        self.original_last_error = auth_state_manager._last_error
        self.original_running = auth_state_manager._running

    def tearDown(self):
        auth_state_manager._message = self.original_message
        auth_state_manager._last_error = self.original_last_error
        auth_state_manager._running = self.original_running
        self.seed_db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_create_account_blocked_while_batch_running(self):
        response = self.client.post('/api/accounts', json={'name': '新公众号'})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), RUNNING_ACCOUNT_MUTATION_MESSAGE)

    def test_update_account_blocked_while_batch_running(self):
        response = self.client.patch(f'/api/accounts/{self.account_id}', json={'isSelected': False})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), RUNNING_ACCOUNT_MUTATION_MESSAGE)

    def test_delete_account_blocked_while_batch_running(self):
        response = self.client.delete(f'/api/accounts/{self.account_id}')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), RUNNING_ACCOUNT_MUTATION_MESSAGE)

    def test_start_crawl_returns_conflict_while_batch_running(self):
        response = self.client.post('/api/crawl')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), RUNNING_CRAWL_MESSAGE)

    def test_auth_status_uses_logged_in_message_after_restart(self):
        auth_state_manager._message = DEFAULT_AUTH_MESSAGES['logged_out']
        auth_state_manager._last_error = 'stale'
        auth_state_manager._running = False

        response = self.client.get('/api/auth/status')
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['loginStatus'], 'logged_in')
        self.assertEqual(payload['message'], DEFAULT_AUTH_MESSAGES['logged_in'])
        self.assertIsNone(payload['lastError'])
        self.assertFalse(payload['canRetry'])


if __name__ == '__main__':
    unittest.main()
