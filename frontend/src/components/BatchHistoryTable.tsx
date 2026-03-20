import { Download, Eye } from 'lucide-react'
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

export default function BatchHistoryTable({ batches, selectedBatchId, onSelect, onDownloadBatch }: BatchHistoryTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
         <h3 className="text-lg font-semibold text-gray-800">历史批次</h3>
      </div>
      
      {batches.length === 0 ? (
        <div className="p-8 text-center text-gray-500">暂无历史批次</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">批次号</th>
                <th className="px-6 py-4 whitespace-nowrap">状态</th>
                <th className="px-6 py-4 whitespace-nowrap">进度</th>
                <th className="px-6 py-4 whitespace-nowrap">文章数</th>
                <th className="px-6 py-4 whitespace-nowrap">开始时间</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((batch) => (
                <tr 
                  key={batch.id} 
                  className={`hover:bg-gray-50 transition-colors ${selectedBatchId === batch.id ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    #{batch.batchNo ?? batch.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      batch.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : batch.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : batch.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}>
                      {statusTextMap[batch.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {batch.completedAccounts} / {batch.totalAccounts}
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {batch.totalArticles}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {batch.startedAt}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onSelect(batch.id)}
                        disabled={selectedBatchId === batch.id}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedBatchId === batch.id 
                            ? 'text-blue-600 bg-blue-100' 
                            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownloadBatch(batch.id)}
                         className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         title="下载 ZIP"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
