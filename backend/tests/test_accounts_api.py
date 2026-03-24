from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.accounts import router as accounts_router
from backend.api.deps import get_db
from backend.models.schema import Account, Settings
from backend.services.errors import WechatAuthError
from backend.storage.database import Base


class TestAccountsApi(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.seed_db = self.session_factory()
        self.seed_db.add(Settings(login_status='logged_in'))
        self.seed_db.commit()

        app = FastAPI()
        app.include_router(accounts_router)

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.seed_db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    @patch('backend.services.account_service.crawler_service.has_credentials', return_value=True)
    @patch('backend.services.account_service.search_accounts')
    def test_precheck_returns_exact_match(self, mock_search_accounts, _mock_has_credentials):
        mock_search_accounts.return_value = [{'nickname': '机器之心', 'fakeid': 'fake-001'}]

        response = self.client.post('/api/accounts/precheck', json={'name': '机器之心'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                'status': 'exact_match',
                'exactMatch': {'nickname': '机器之心', 'fakeid': 'fake-001'},
            },
        )

    @patch('backend.services.account_service.crawler_service.has_credentials', return_value=True)
    @patch('backend.services.account_service.search_accounts')
    def test_precheck_returns_candidates(self, mock_search_accounts, _mock_has_credentials):
        mock_search_accounts.return_value = [
            {'nickname': '机器之心日报', 'fakeid': 'fake-001'},
            {'nickname': '机器之心观察', 'fakeid': 'fake-002'},
        ]

        response = self.client.post('/api/accounts/precheck', json={'name': '机器之心'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'candidates')
        self.assertEqual(len(response.json()['candidates']), 2)

    @patch('backend.services.account_service.crawler_service.has_credentials', return_value=True)
    @patch('backend.services.account_service.search_accounts', side_effect=WechatAuthError('expired'))
    def test_precheck_marks_login_expired_on_auth_error(self, _mock_search_accounts, _mock_has_credentials):
        response = self.client.post('/api/accounts/precheck', json={'name': '机器之心'})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], '微信登录状态已失效，请重新登录后再添加公众号')

        db = self.session_factory()
        try:
            settings = db.query(Settings).first()
            self.assertIsNotNone(settings)
            self.assertEqual(settings.login_status, 'expired')
        finally:
            db.close()

    def test_create_account_uses_resolved_name_and_fakeid(self):
        response = self.client.post(
            '/api/accounts',
            json={
                'name': '机器',
                'resolvedName': '机器之心',
                'fakeid': 'fake-001',
                'isSelected': True,
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload['name'], '机器之心')
        self.assertEqual(payload['fakeid'], 'fake-001')
        self.assertTrue(payload['isSelected'])

    def test_create_account_rejects_duplicate_fakeid(self):
        db = self.session_factory()
        db.add(Account(name='机器之心', fakeid='fake-001', is_selected=False))
        db.commit()
        db.close()

        response = self.client.post(
            '/api/accounts',
            json={
                'name': '机器',
                'resolvedName': '机器之心日报',
                'fakeid': 'fake-001',
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], '该公众号已存在')


if __name__ == '__main__':
    unittest.main()
