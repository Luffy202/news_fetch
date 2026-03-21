from __future__ import annotations

import logging
from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session

from backend.models.schema import Article, Batch
from backend.services.errors import ConflictError
from backend.services.runtime_guard import EXPORT_COMPLETED_ONLY_MESSAGE

logger = logging.getLogger(__name__)


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_article_markdown(self, article_id: int) -> tuple[str, bytes]:
        logger.info('开始导出 Markdown: article_id=%s', article_id)
        article = self.get_article_or_raise(article_id)
        self.ensure_batch_completed(article.batch_id)
        filename = self.build_article_filename(article, 'md')
        logger.info('Markdown 导出完成: article_id=%s, filename=%s', article_id, filename)
        return filename, self.render_article_markdown(article).encode('utf-8')

    def export_article_docx(self, article_id: int) -> tuple[str, bytes]:
        logger.info('开始导出 DOCX: article_id=%s', article_id)
        article = self.get_article_or_raise(article_id)
        self.ensure_batch_completed(article.batch_id)
        filename = self.build_article_filename(article, 'docx')
        logger.info('DOCX 导出完成: article_id=%s, filename=%s', article_id, filename)
        return filename, self.render_article_docx(article)

    def export_batch_zip(self, batch_id: int) -> tuple[str, bytes]:
        logger.info('开始导出批量 ZIP: batch_id=%s', batch_id)
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if batch is None:
            raise ValueError('批次不存在')
        self.ensure_batch_completed(batch.id, batch=batch)

        articles = self.db.query(Article).filter(Article.batch_id == batch_id).order_by(Article.created_at.asc()).all()
        if not articles:
            raise ValueError('该批次暂无可导出文章')

        output = BytesIO()
        with ZipFile(output, 'w', compression=ZIP_DEFLATED) as zip_file:
            for index, article in enumerate(articles, start=1):
                filename = f'{index:02d}-{self.slugify(article.title) or article.id}.md'
                zip_file.writestr(filename, self.render_article_markdown(article))

        archive_name = f'batch-{batch.id}-articles.zip'
        logger.info('批量 ZIP 导出完成: batch_id=%s, filename=%s, articles=%s', batch_id, archive_name, len(articles))
        return archive_name, output.getvalue()

    def render_article_markdown(self, article: Article) -> str:
        export_data = self.build_article_export_data(article)
        return '\n'.join([
            f'# {export_data["title"]}',
            '',
            f'- 发布时间：{export_data["publish_time"]}',
            f'- 原文链接：{export_data["source"]}',
            '',
            '## 摘要',
            '',
            export_data['summary'],
            '',
            '## 正文',
            '',
            export_data['content'],
            '',
        ])

    def render_article_docx(self, article: Article) -> bytes:
        export_data = self.build_article_export_data(article)
        lines = [
            export_data['title'],
            f'发布时间：{export_data["publish_time"]}',
            f'原文链接：{export_data["source"]}',
            '',
            '摘要',
            export_data['summary'],
            '',
            '正文',
            export_data['content'],
        ]

        output = BytesIO()
        with ZipFile(output, 'w', compression=ZIP_DEFLATED) as zip_file:
            zip_file.writestr(
                '[Content_Types].xml',
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '</Types>',
            )
            zip_file.writestr(
                '_rels/.rels',
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                'Target="word/document.xml"/>'
                '</Relationships>',
            )
            paragraphs = ''.join(self.render_docx_paragraph_xml(line) for line in lines)
            zip_file.writestr(
                'word/document.xml',
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                f'<w:body>{paragraphs}<w:sectPr/></w:body>'
                '</w:document>',
            )
        return output.getvalue()

    def get_article_or_raise(self, article_id: int) -> Article:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if article is None:
            raise ValueError('文章不存在')
        return article

    def ensure_batch_completed(self, batch_id: int, *, batch: Batch | None = None) -> Batch:
        resolved_batch = batch or self.db.query(Batch).filter(Batch.id == batch_id).first()
        if resolved_batch is None:
            raise ValueError('批次不存在')
        if resolved_batch.status != 'completed':
            raise ConflictError(EXPORT_COMPLETED_ONLY_MESSAGE)
        return resolved_batch

    def build_article_filename(self, article: Article, extension: str) -> str:
        return f'{self.slugify(article.title) or article.id}.{extension}'

    def build_article_export_data(self, article: Article) -> dict[str, str]:
        return {
            'title': article.title or '无标题',
            'publish_time': article.publish_time or '未知时间',
            'source': article.url or '无原文链接',
            'summary': article.summary or article.digest or '暂无摘要',
            'content': article.content or '正文缺失',
        }

    def render_docx_paragraph_xml(self, line: str) -> str:
        segments = line.splitlines() or ['']
        runs: list[str] = []
        for index, segment in enumerate(segments):
            runs.append(f'<w:r><w:t xml:space="preserve">{escape(segment)}</w:t></w:r>')
            if index < len(segments) - 1:
                runs.append('<w:r><w:br/></w:r>')
        return f'<w:p>{"".join(runs)}</w:p>'

    def slugify(self, value: str) -> str:
        keep_chars = []
        for char in value:
            if char.isalnum() or char in ('-', '_'):
                keep_chars.append(char)
            elif char.isspace():
                keep_chars.append('-')
        slug = ''.join(keep_chars).strip('-')
        return slug[:80]
