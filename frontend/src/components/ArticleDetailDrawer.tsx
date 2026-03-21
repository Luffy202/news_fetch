import { useEffect } from 'react'
import { Calendar, Download, ExternalLink, FileText, X } from 'lucide-react'

import type { BatchDetail } from '../types/api'

const statusTextMap: Record<BatchDetail['status'], string> = {
  waiting: '等待中',
  running: '抓取中',
  completed: '已完成',
  failed: '失败',
}

type ArticleDetailDrawerProps = {
  batch?: BatchDetail
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onClose?: () => void
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '暂无记录'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.replace('T', ' ').replace(/\.\d+Z?$/, '')
  }

  return parsed.toLocaleString('zh-CN', { hour12: false })
}

export default function ArticleDetailDrawer({
  batch,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
  onClose,
}: ArticleDetailDrawerProps) {
  useEffect(() => {
    if (!batch) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [batch, onClose])

  if (!batch) {
    return null
  }

  const canExport = batch.status === 'completed'
  const exportBlockedReason = canExport ? '' : '仅支持导出已完成批次'
  const getAccountName = (accountId: number) => batch.selectedAccounts.find((account) => account.id === accountId)?.name ?? `公众号 #${accountId}`

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-[680px] max-w-full overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">批次详情 #{batch.batchNo ?? batch.id}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  batch.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : batch.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : batch.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusTextMap[batch.status]}
              </span>
              <span className="text-xs text-gray-500">开始时间：{formatDateTime(batch.startedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownloadBatch(batch.id)}
              disabled={!canExport}
              className={`rounded-lg p-2 transition-colors ${
                canExport
                  ? 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                  : 'cursor-not-allowed text-gray-300'
              }`}
              title={exportBlockedReason || '批量下载 ZIP'}
            >
              <Download className="h-5 w-5" />
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                title="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {!canExport ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              仅支持导出已完成批次，当前批次仍在处理中。
            </div>
          ) : null}

          {batch.errorMessage ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{batch.errorMessage}</div>
          ) : null}

          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">文章列表 ({batch.articles.length})</h3>

            {batch.articles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
                当前批次暂无文章结果。
              </div>
            ) : (
              <div className="space-y-4">
                {batch.articles.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:shadow-md"
                  >
                    <h4 className="mb-2 font-semibold leading-7 text-gray-900">{article.title}</h4>
                    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {article.publishTime ?? '未知时间'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getAccountName(article.accountId ?? 0)}
                      </span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
                      >
                        查看原文
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {article.digest || article.summary ? (
                      <p className="mb-3 line-clamp-3 text-sm leading-6 text-gray-600">{article.summary ?? article.digest}</p>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onDownloadArticle(article.id)}
                          disabled={!canExport}
                          title={exportBlockedReason || '下载 MD'}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            canExport
                              ? 'border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600'
                              : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Download className="h-4 w-4" />
                          下载 MD
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadArticleDocx(article.id)}
                          disabled={!canExport}
                          title={exportBlockedReason || '下载 DOCX'}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            canExport
                              ? 'border-gray-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100'
                              : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Download className="h-4 w-4" />
                          下载 DOCX
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
