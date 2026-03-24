from __future__ import annotations

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.batches import router as batches_router
from backend.api.deps import get_db
from backend.models.schema import Account, Article, Batch, TaskEvent
from backend.storage.database import Base


class TestBatchesApi(unittest.TestCase):
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
        self.seed_db.add(account)
        self.seed_db.flush()

        waiting_batch = Batch(batch_no='BATCH-WAITING', status='waiting', selected_account_ids=f'[{account.id}]')
        completed_batch = Batch(batch_no='BATCH-COMPLETED', status='completed', selected_account_ids=f'[{account.id}]')
        failed_batch = Batch(batch_no='BATCH-FAILED', status='failed', selected_account_ids=f'[{account.id}]')
        running_batch = Batch(batch_no='BATCH-RUNNING', status='running', selected_account_ids=f'[{account.id}]')
        self.seed_db.add_all([waiting_batch, completed_batch, failed_batch, running_batch])
        self.seed_db.flush()

        completed_article = Article(
            batch_id=completed_batch.id,
            account_id=account.id,
            title='完成批次文章',
            url='https://mp.weixin.qq.com/s/completed',
        )
        failed_article = Article(
            batch_id=failed_batch.id,
            account_id=account.id,
            title='失败批次文章',
            url='https://mp.weixin.qq.com/s/failed',
        )
        self.seed_db.add_all([completed_article, failed_article])
        self.seed_db.add_all(
            [
                TaskEvent(batch_id=completed_batch.id, message='完成日志'),
                TaskEvent(batch_id=failed_batch.id, message='失败日志'),
            ]
        )
        self.seed_db.commit()

        self.waiting_batch_id = waiting_batch.id
        self.completed_batch_id = completed_batch.id
        self.failed_batch_id = failed_batch.id
        self.running_batch_id = running_batch.id

        app = FastAPI()
        app.include_router(batches_router)

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

    def _count_rows(self, model, **filters) -> int:
        db = self.session_factory()
        try:
            query = db.query(model)
            for key, value in filters.items():
                query = query.filter(getattr(model, key) == value)
            return query.count()
        finally:
            db.close()

    def test_delete_completed_batch_cleans_articles_and_events(self):
        response = self.client.delete(f'/api/batches/{self.completed_batch_id}')

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self._count_rows(Batch, id=self.completed_batch_id), 0)
        self.assertEqual(self._count_rows(Article, batch_id=self.completed_batch_id), 0)
        self.assertEqual(self._count_rows(TaskEvent, batch_id=self.completed_batch_id), 0)

    def test_delete_failed_and_waiting_batches_success(self):
        failed_response = self.client.delete(f'/api/batches/{self.failed_batch_id}')
        waiting_response = self.client.delete(f'/api/batches/{self.waiting_batch_id}')

        self.assertEqual(failed_response.status_code, 204)
        self.assertEqual(waiting_response.status_code, 204)
        self.assertEqual(self._count_rows(Batch, id=self.failed_batch_id), 0)
        self.assertEqual(self._count_rows(Batch, id=self.waiting_batch_id), 0)

    def test_delete_running_batch_rejected(self):
        response = self.client.delete(f'/api/batches/{self.running_batch_id}')

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), '运行中的批次不可删除')
        self.assertEqual(self._count_rows(Batch, id=self.running_batch_id), 1)

    def test_delete_missing_batch_returns_not_found(self):
        response = self.client.delete('/api/batches/999999')

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json().get('detail'), '批次不存在')


if __name__ == '__main__':
    unittest.main()
