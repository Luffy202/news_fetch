import { useEffect, useState } from 'react'
import { BarChart3, Database, History } from 'lucide-react'

import ArticleDetailDrawer from '../components/ArticleDetailDrawer'
import BatchHistoryTable from '../components/BatchHistoryTable'
import DashboardArticleResults from '../components/DashboardArticleResults'
import DashboardDistributionPanel from '../components/DashboardDistributionPanel'
import DashboardSummaryCards from '../components/DashboardSummaryCards'
import type { Batch, BatchDetail, DashboardSummary } from '../types/api'

type DashboardPageProps = {
  summary?: DashboardSummary
  batches: Batch[]
  selectedBatch?: BatchDetail
  onSelectBatch: (batchId: number) => Promise<void> | void
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
}

export default function DashboardPage({
  summary,
  batches,
  selectedBatch,
  onSelectBatch,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
}: DashboardPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!selectedBatch) {
      setIsDrawerOpen(false)
    }
  }, [selectedBatch])

  if (!summary) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-gray-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
        <p className="mt-4 text-sm">正在加载历史抓取数据...</p>
      </div>
    )
  }

  const hasResults = batches.length > 0 || summary.totalBatches > 0 || summary.totalArticles > 0

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-[linear-gradient(135deg,#fbfdff_0%,#f7fafc_50%,#ffffff_100%)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Database className="h-3.5 w-3.5 text-blue-600" />
              历史抓取看板
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">先看批次，再看详情。</h2>
          </div>

          <div className="rounded-2xl border border-white bg-white/90 px-5 py-4 shadow-sm">
            <div className="text-xs text-slate-500">当前批次</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">#{selectedBatch?.batchNo ?? selectedBatch?.id ?? '未选择'}</div>
          </div>
        </div>
      </section>

      <DashboardSummaryCards summary={summary} />

      {hasResults ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.02fr_1.18fr]">
          <BatchHistoryTable
            batches={batches}
            selectedBatchId={selectedBatch?.id}
            onSelect={onSelectBatch}
            onDownloadBatch={onDownloadBatch}
          />
          <DashboardArticleResults
            batch={selectedBatch}
            onDownloadArticle={onDownloadArticle}
            onDownloadArticleDocx={onDownloadArticleDocx}
            onDownloadBatch={onDownloadBatch}
            onOpenDetail={() => setIsDrawerOpen(true)}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center text-sm text-gray-500">
          <History className="mx-auto mb-4 h-8 w-8 text-gray-400" />
          暂无历史抓取记录。
        </div>
      )}

      <details className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <BarChart3 className="h-3.5 w-3.5" />
              统计分布
            </div>
          </div>
          <span className="text-sm font-medium text-slate-600">展开</span>
        </summary>
        <div className="grid grid-cols-1 gap-6 border-t border-gray-100 p-6 lg:grid-cols-2">
          <DashboardDistributionPanel
            title="批次状态"
            items={summary.batchStatusDistribution}
            emptyText="暂无批次状态数据"
          />
          <DashboardDistributionPanel
            title="公众号文章"
            items={summary.accountArticleDistribution}
            emptyText="暂无公众号文章数据"
          />
        </div>
      </details>

      {selectedBatch && isDrawerOpen ? (
        <ArticleDetailDrawer
          batch={selectedBatch}
          onDownloadArticle={onDownloadArticle}
          onDownloadArticleDocx={onDownloadArticleDocx}
          onDownloadBatch={onDownloadBatch}
          onClose={() => {
            setIsDrawerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
