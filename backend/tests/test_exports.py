from __future__ import annotations

from io import BytesIO
import unittest
from zipfile import ZipFile

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.deps import get_db
from backend.api.exports import router as exports_router
from backend.models.schema import Account, Article, Batch
from backend.services.export_service import ExportService
from backend.storage.database import Base


class TestExports(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.seed_db = self.session_factory()

        account = Account(name='测试号', fakeid='fakeid-1', is_selected=True)
        batch = Batch(batch_no='BATCH-001', status='completed', selected_account_ids='[1]')
        self.seed_db.add_all([account, batch])
        self.seed_db.flush()
        article = Article(
            batch_id=batch.id,
            account_id=account.id,
            title='测试文章 DOCX 导出',
            url='https://mp.weixin.qq.com/s/test',
            summary='这是摘要',
            content='第一段\n第二段',
            publish_time='2026-03-19 10:00:00',
        )
        self.seed_db.add(article)
        self.seed_db.commit()
        self.article_id = article.id

        app = FastAPI()
        app.include_router(exports_router)

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

    def test_export_article_docx_service(self):
        db = self.session_factory()
        service = ExportService(db)
        filename, content = service.export_article_docx(self.article_id)
        db.close()

        self.assertTrue(filename.endswith('.docx'))
        with ZipFile(BytesIO(content)) as zip_file:
            names = zip_file.namelist()
            self.assertIn('[Content_Types].xml', names)
            self.assertIn('_rels/.rels', names)
            self.assertIn('word/document.xml', names)
            document_xml = zip_file.read('word/document.xml').decode('utf-8')
            self.assertIn('测试文章 DOCX 导出', document_xml)
            self.assertIn('发布时间：2026-03-19 10:00:00', document_xml)
            self.assertIn('第一段', document_xml)
            self.assertIn('第二段', document_xml)

    def test_download_article_docx_api_headers(self):
        response = self.client.get(f'/api/articles/{self.article_id}/docx')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get('content-type'),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        content_disposition = response.headers.get('content-disposition', '')
        self.assertIn("attachment;", content_disposition)
        self.assertIn('filename="export.docx"', content_disposition)
        self.assertIn("filename*=UTF-8''", content_disposition)

    def test_download_article_docx_not_found(self):
        response = self.client.get('/api/articles/999999/docx')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json().get('detail'), '文章不存在')


if __name__ == '__main__':
    unittest.main()
