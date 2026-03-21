import { AlertTriangle, Calendar, Download, ExternalLink, FileText, Files, PanelRightOpen } from 'lucide-react'

import type { BatchDetail } from '../types/api'

type DashboardArticleResultsProps = {
  batch?: BatchDetail
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onOpenDetail: () => void
}

const batchStatusTextMap: Record<BatchDetail['status'], string> = {
  waiting: '等待中',
  running: '抓取中',
  completed: '已完成',
  failed: '失败',
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

function statusChipClass(status: BatchDetail['status']) {
  if (status === 'completed') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'running') {
    return 'bg-blue-100 text-blue-700'
  }
  if (status === 'failed') {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-gray-100 text-gray-700'
}

export default function DashboardArticleResults({
  batch,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
  onOpenDetail,
}: DashboardArticleResultsProps) {
  if (!batch) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        请选择一条历史抓取批次，右侧会展示这次抓取到的文章、异常和下载入口。
      </section>
    )
  }

  const accountNameMap = new Map(batch.selectedAccounts.map((account) => [account.id, account.name]))
  const canExport = batch.status === 'completed'
  const exportBlockedReason = canExport ? '' : '仅支持导出已完成批次'

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                当前批次 #{batch.batchNo ?? batch.id}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusChipClass(batch.status)}`}>
                {batchStatusTextMap[batch.status]}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm text-gray-500 md:grid-cols-3">
              <div>开始时间：{formatDateTime(batch.startedAt)}</div>
              <div>文章数量：{batch.articles.length}</div>
              <div>抓取公众号：{batch.selectedAccounts.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onDownloadBatch(batch.id)}
              disabled={!canExport}
              title={exportBlockedReason || '批量下载 ZIP'}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                canExport
                  ? 'border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700'
                  : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              }`}
            >
              <Files className="h-4 w-4" />
              批量下载 ZIP
            </button>
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-700"
            >
              <PanelRightOpen className="h-4 w-4" />
              辅助详情
            </button>
          </div>
        </div>

        {batch.errorMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">该批次存在异常</div>
              <div className="mt-1">{batch.errorMessage}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">本次抓取文章</h3>
            <p className="mt-1 text-sm text-gray-500">按时间和公众号快速阅读这次抓取的具体内容。</p>
          </div>
          <span className="text-sm text-gray-500">支持逐篇下载 MD / DOCX</span>
        </div>

        {!canExport ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            仅支持导出已完成批次，当前批次仍在处理中。
          </div>
        ) : null}

        {batch.articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            {batch.status === 'failed' ? '该批次抓取失败，没有生成可浏览文章。' : '该批次暂无文章数据。'}
          </div>
        ) : (
          <div className="space-y-4">
            {batch.articles.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold leading-7 text-gray-900">{article.title}</h4>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {article.publishTime ?? '未知时间'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {accountNameMap.get(article.accountId ?? -1) ?? `公众号 #${article.accountId ?? '-'}`}
                      </span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        查看原文
                      </a>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {article.summary ?? article.digest ?? '暂无摘要。'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:max-w-[260px] lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onDownloadArticle(article.id)}
                      disabled={!canExport}
                      title={exportBlockedReason || '下载 MD'}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        canExport
                          ? 'border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700'
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
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        canExport
                          ? 'border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700'
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
      </div>
    </section>
  )
}
