type ArticleExportActionsProps = {
  articleId?: number
  batchId?: number
  onDownloadArticle?: (articleId: number) => Promise<void> | void
  onDownloadBatch?: (batchId: number) => Promise<void> | void
}

export default function ArticleExportActions({
  articleId,
  batchId,
  onDownloadArticle,
  onDownloadBatch,
}: ArticleExportActionsProps) {
  return (
    <div>
      {typeof articleId === 'number' ? (
        <button type="button" onClick={() => onDownloadArticle?.(articleId)}>
          下载 Markdown
        </button>
      ) : null}
      {typeof batchId === 'number' ? (
        <button type="button" onClick={() => onDownloadBatch?.(batchId)}>
          批量下载 ZIP
        </button>
      ) : null}
    </div>
  )
}
