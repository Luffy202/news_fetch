from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.schema import Settings
from backend.services.auth_service import AuthService
from backend.services.auth_state import auth_state_manager
from backend.storage.database import Base


class TestAuthService(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.session_factory()
        self.db.add(Settings(login_status='logged_in'))
        self.db.commit()
        self.service = AuthService(self.db)

        self.original_message = auth_state_manager._message
        self.original_last_error = auth_state_manager._last_error
        self.original_running = auth_state_manager._running

    def tearDown(self):
        auth_state_manager._message = self.original_message
        auth_state_manager._last_error = self.original_last_error
        auth_state_manager._running = self.original_running
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    @patch('backend.services.auth_service.crawler_service.has_credentials', return_value=True)
    def test_trigger_login_without_force_reuses_logged_in_status(self, _mock_has_credentials):
        with patch('backend.services.auth_service.auth_state_manager.begin') as mock_begin:
            payload = self.service.trigger_login(force=False)

        mock_begin.assert_not_called()
        self.assertEqual(payload['loginStatus'], 'logged_in')

    @patch('backend.services.auth_service.crawler_service.has_credentials', return_value=True)
    @patch('backend.services.auth_service.Thread')
    def test_trigger_login_with_force_starts_login_flow(self, mock_thread, _mock_has_credentials):
        thread_instance = Mock()
        mock_thread.return_value = thread_instance
        auth_state_manager._running = True

        with patch('backend.services.auth_service.auth_state_manager.begin', return_value=True) as mock_begin:
            payload = self.service.trigger_login(force=True)

        mock_begin.assert_called_once()
        thread_instance.start.assert_called_once()
        self.assertEqual(payload['loginStatus'], 'launching_browser')


if __name__ == '__main__':
    unittest.main()
