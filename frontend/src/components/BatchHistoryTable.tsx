import { AlertTriangle, Download, Eye } from 'lucide-react'

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
  onDownloadBatch: (batchId: number) => Promise<void> | void
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

export default function BatchHistoryTable({ batches, selectedBatchId, onSelect, onDownloadBatch }: BatchHistoryTableProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">历史抓取批次</h3>
            <p className="mt-1 text-sm text-gray-500">先定位一次抓取，再查看这次抓到了哪些文章和异常。</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{batches.length} 条记录</span>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">暂无历史抓取批次。</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">批次号</th>
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
                  className={`transition-colors hover:bg-gray-50 ${selectedBatchId === batch.id ? 'bg-blue-50/70' : ''}`}
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
                        onClick={() => onSelect(batch.id)}
                        className={`rounded-lg p-2 transition-colors ${
                          selectedBatchId === batch.id
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        title="查看批次数据"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadBatch(batch.id)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
