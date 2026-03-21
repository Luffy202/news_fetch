from __future__ import annotations

import unittest
from io import BytesIO
from zipfile import ZipFile

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.deps import get_db
from backend.api.exports import router as exports_router
from backend.models.schema import Account, Article, Batch
from backend.services.errors import ConflictError
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

        account = Account(name='测试公众号', fakeid='fakeid-1', is_selected=True)
        completed_batch = Batch(batch_no='BATCH-001', status='completed', selected_account_ids='[1]')
        running_batch = Batch(batch_no='BATCH-002', status='running', selected_account_ids='[1]')
        self.seed_db.add_all([account, completed_batch, running_batch])
        self.seed_db.flush()

        completed_article = Article(
            batch_id=completed_batch.id,
            account_id=account.id,
            title='测试文章 DOCX 导出',
            url='https://mp.weixin.qq.com/s/test',
            summary='这是摘要',
            content='第一段\n第二段',
            publish_time='2026-03-19 10:00:00',
        )
        running_article = Article(
            batch_id=running_batch.id,
            account_id=account.id,
            title='运行中文章',
            url='https://mp.weixin.qq.com/s/running',
            summary='处理中',
            content='处理中正文',
            publish_time='2026-03-20 08:00:00',
        )
        self.seed_db.add_all([completed_article, running_article])
        self.seed_db.commit()

        self.article_id = completed_article.id
        self.running_article_id = running_article.id
        self.completed_batch_id = completed_batch.id
        self.running_batch_id = running_batch.id

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

    def test_export_article_markdown_service(self):
        db = self.session_factory()
        service = ExportService(db)
        filename, content = service.export_article_markdown(self.article_id)
        db.close()

        markdown_text = content.decode('utf-8')
        self.assertTrue(filename.endswith('.md'))
        self.assertIn('# 测试文章 DOCX 导出', markdown_text)
        self.assertIn('- 发布时间：2026-03-19 10:00:00', markdown_text)
        self.assertIn('- 原文链接：https://mp.weixin.qq.com/s/test', markdown_text)
        self.assertIn('## 摘要', markdown_text)
        self.assertIn('## 正文', markdown_text)
        self.assertIn('第一段\n第二段', markdown_text)

    def test_download_article_markdown_api_headers(self):
        response = self.client.get(f'/api/articles/{self.article_id}/markdown')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('content-type'), 'text/markdown; charset=utf-8')
        self.assertIn('## 正文', response.content.decode('utf-8'))
        content_disposition = response.headers.get('content-disposition', '')
        self.assertIn('attachment;', content_disposition)
        self.assertIn('filename="export.md"', content_disposition)
        self.assertIn("filename*=UTF-8''", content_disposition)

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
            self.assertIn('原文链接：https://mp.weixin.qq.com/s/test', document_xml)
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
        self.assertIn('attachment;', content_disposition)
        self.assertIn('filename="export.docx"', content_disposition)
        self.assertIn("filename*=UTF-8''", content_disposition)

    def test_download_article_markdown_not_found(self):
        response = self.client.get('/api/articles/999999/markdown')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json().get('detail'), '文章不存在')

    def test_download_article_docx_not_found(self):
        response = self.client.get('/api/articles/999999/docx')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json().get('detail'), '文章不存在')

    def test_export_running_article_markdown_service_rejected(self):
        db = self.session_factory()
        service = ExportService(db)
        with self.assertRaises(ConflictError):
            service.export_article_markdown(self.running_article_id)
        db.close()

    def test_export_running_article_docx_api_rejected(self):
        response = self.client.get(f'/api/articles/{self.running_article_id}/docx')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), '仅支持导出已完成批次')

    def test_export_running_batch_zip_api_rejected(self):
        response = self.client.get(f'/api/batches/{self.running_batch_id}/markdown-export')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json().get('detail'), '仅支持导出已完成批次')

    def test_download_batch_zip_success(self):
        response = self.client.get(f'/api/batches/{self.completed_batch_id}/markdown-export')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('content-type'), 'application/zip')
        with ZipFile(BytesIO(response.content)) as zip_file:
            self.assertTrue(any(name.endswith('.md') for name in zip_file.namelist()))


if __name__ == '__main__':
    unittest.main()
