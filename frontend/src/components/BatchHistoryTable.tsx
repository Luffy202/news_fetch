import { AlertTriangle, Download, Eye, Trash2 } from 'lucide-react'

import type { Batch } from '../types/api'

const statusTextMap: Record<Batch['status'], string> = {
  waiting: '等待中',
  running: '抓取中',
  completed: '已完成',
  failed: '失败',
}

type BatchHistoryTableProps = {
  batches: Batch[]
  selectedBatchId?: number
  onSelect: (batchId: number) => Promise<void> | void
  onOpenArticles: (batchId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onDeleteBatch: (batchId: number) => Promise<void> | void
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

function statusChipClass(status: Batch['status']) {
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

export default function BatchHistoryTable({
  batches,
  selectedBatchId,
  onSelect,
  onOpenArticles,
  onDownloadBatch,
  onDeleteBatch,
}: BatchHistoryTableProps) {
  const handleDelete = async (batch: Batch) => {
    const confirmed = window.confirm('删除后将清空该项目批次的文章和日志记录，确认继续吗？')
    if (!confirmed) {
      return
    }
    await onDeleteBatch(batch.id)
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">项目批次</h3>
            <p className="mt-1 text-sm leading-6 text-gray-500">先选一个项目批次，再查看这次抓取的文章、异常和日志。</p>
          </div>
          <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{batches.length} 条记录</span>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">暂无项目批次。</div>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {batches.map((batch) => (
              <article
                key={batch.id}
                className={`rounded-2xl border px-4 py-4 transition-colors ${
                  selectedBatchId === batch.id ? 'border-slate-900/15 bg-slate-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <button type="button" onClick={() => onSelect(batch.id)} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">#{batch.batchNo ?? batch.id}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(batch.status)}`}>
                        {statusTextMap[batch.status]}
                      </span>
                      {batch.status === 'failed' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : null}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-gray-500">{formatDateTime(batch.startedAt)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onOpenArticles(batch.id)}
                    className={`rounded-xl p-2 transition-colors ${
                      selectedBatchId === batch.id ? 'bg-slate-900 text-white' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                    title="查看批次文章"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <div className="text-[11px] text-gray-500">文章数</div>
                    <div className="mt-1 font-medium text-gray-900">{batch.totalArticles}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <div className="text-[11px] text-gray-500">公众号</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {batch.completedAccounts} / {batch.totalAccounts}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onDownloadBatch(batch.id)}
                    disabled={batch.status !== 'completed'}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      batch.status === 'completed'
                        ? 'border border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700'
                        : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    }`}
                    title={batch.status === 'completed' ? '批量下载 ZIP' : '仅支持导出已完成批次'}
                  >
                    <Download className="h-4 w-4" />
                    下载
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(batch)}
                    disabled={batch.status === 'running'}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      batch.status === 'running'
                        ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                        : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                    title={batch.status === 'running' ? '运行中的批次不可删除' : '删除项目批次'}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[40rem] w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">项目批次</th>
                  <th className="px-6 py-4 whitespace-nowrap">状态</th>
                  <th className="px-6 py-4 whitespace-nowrap">时间</th>
                  <th className="px-6 py-4 whitespace-nowrap">文章数</th>
                  <th className="px-6 py-4 whitespace-nowrap">公众号</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() => onSelect(batch.id)}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedBatchId === batch.id ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">#{batch.batchNo ?? batch.id}</span>
                        {batch.status === 'failed' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(batch.status)}`}>
                        {statusTextMap[batch.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{formatDateTime(batch.startedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{batch.totalArticles}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {batch.completedAccounts} / {batch.totalAccounts}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onOpenArticles(batch.id)
                          }}
                          className={`rounded-lg p-2 transition-colors ${
                            selectedBatchId === batch.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="查看批次文章"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onDownloadBatch(batch.id)
                          }}
                          disabled={batch.status !== 'completed'}
                          className={`rounded-lg p-2 transition-colors ${
                            batch.status === 'completed'
                              ? 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                              : 'cursor-not-allowed text-gray-300'
                          }`}
                          title={batch.status === 'completed' ? '批量下载 ZIP' : '仅支持导出已完成批次'}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDelete(batch)
                          }}
                          disabled={batch.status === 'running'}
                          className={`rounded-lg p-2 transition-colors ${
                            batch.status === 'running'
                              ? 'cursor-not-allowed text-gray-300'
                              : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title={batch.status === 'running' ? '运行中的批次不可删除' : '删除项目批次'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
