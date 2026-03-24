import { AlertTriangle, Files, ListTree, Logs, Trash2 } from 'lucide-react'

import TaskEventList from './TaskEventList'
import type { BatchDetail } from '../types/api'

type DashboardArticleResultsProps = {
  batch?: BatchDetail
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onDeleteBatch: (batchId: number) => Promise<void> | void
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
  onDownloadBatch,
  onDeleteBatch,
}: DashboardArticleResultsProps) {
  if (!batch) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        请选择一个项目批次，右侧会展示该批次的详情、文章和日志。
      </section>
    )
  }

  const canExport = batch.status === 'completed'
  const canDelete = batch.status !== 'running'
  const exportBlockedReason = canExport ? '' : '仅支持导出已完成批次'

  const handleDelete = async () => {
    const confirmed = window.confirm('删除后将清空该项目批次的文章和日志记录，确认继续吗？')
    if (!confirmed) {
      return
    }
    await onDeleteBatch(batch.id)
  }

  return (
    <section className="rounded-[1.25rem] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                项目详情 #{batch.batchNo ?? batch.id}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusChipClass(batch.status)}`}>
                {batchStatusTextMap[batch.status]}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-500 sm:grid-cols-2 xl:grid-cols-3">
              <div>开始时间：{formatDateTime(batch.startedAt)}</div>
              <div>文章数量：{batch.articles.length}</div>
              <div>抓取公众号：{batch.selectedAccounts.length}</div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => onDownloadBatch(batch.id)}
              disabled={!canExport}
              title={exportBlockedReason || '批量下载 ZIP'}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
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
              onClick={() => void handleDelete()}
              disabled={!canDelete}
              title={canDelete ? '删除项目批次' : '运行中的批次不可删除'}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
                canDelete
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              删除批次
            </button>
          </div>
        </div>

        {batch.errorMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">本次抓取出现异常</div>
              <div className="mt-1">{batch.errorMessage}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!canExport ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            仅支持导出已完成批次，当前批次仍在处理中。
          </div>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ListTree className="h-4 w-4 text-slate-500" />
            本次项目包含的公众号
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {batch.selectedAccounts.length === 0 ? (
              <span className="text-sm text-gray-500">暂无公众号信息</span>
            ) : (
              batch.selectedAccounts.map((account) => (
                <span key={account.id} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                  {account.name}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="text-sm font-semibold text-gray-900">项目详情摘要</div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
              批次状态：{batchStatusTextMap[batch.status]}
            </div>
            <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
              文章数量：{batch.articles.length}
            </div>
            <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
              完成进度：{batch.completedAccounts} / {batch.totalAccounts}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            点击左侧批次上的小眼睛，可以从右侧抽屉查看该批次的完整文章列表、原文链接和逐篇导出入口。
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Logs className="h-4 w-4 text-slate-500" />
            项目批次日志
          </div>
          <TaskEventList events={batch.events.slice().reverse()} />
        </section>
      </div>
    </section>
  )
}
