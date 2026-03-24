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
  drawerBatch?: BatchDetail
  onSelectBatch: (batchId: number) => Promise<void> | void
  onOpenBatchDrawer: (batchId: number) => Promise<void> | void
  onCloseDrawer: () => void
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onDeleteBatch: (batchId: number) => Promise<void> | void
}

export default function DashboardPage({
  summary,
  batches,
  selectedBatch,
  drawerBatch,
  onSelectBatch,
  onOpenBatchDrawer,
  onCloseDrawer,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
  onDeleteBatch,
}: DashboardPageProps) {
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
    <div className="space-y-4 md:space-y-5">
      <section className="rounded-[1.5rem] border border-gray-200 bg-[linear-gradient(135deg,#fbfdff_0%,#f7fafc_50%,#ffffff_100%)] px-4 py-4 sm:px-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Database className="h-3.5 w-3.5 text-blue-600" />
              项目批次看板
            </div>
            <h2 className="text-[clamp(1.35rem,1vw+1.05rem,1.95rem)] font-semibold tracking-tight text-slate-900">先看批次，再看详情。</h2>
          </div>

          <div className="self-start rounded-xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">当前批次</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">#{selectedBatch?.batchNo ?? selectedBatch?.id ?? '未选择'}</div>
          </div>
        </div>
      </section>

      <DashboardSummaryCards summary={summary} />

      {hasResults ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <BatchHistoryTable
            batches={batches}
            selectedBatchId={selectedBatch?.id}
            onSelect={onSelectBatch}
            onOpenArticles={onOpenBatchDrawer}
            onDownloadBatch={onDownloadBatch}
            onDeleteBatch={onDeleteBatch}
          />
          <DashboardArticleResults
            batch={selectedBatch}
            onDownloadArticle={onDownloadArticle}
            onDownloadArticleDocx={onDownloadArticleDocx}
            onDownloadBatch={onDownloadBatch}
            onDeleteBatch={onDeleteBatch}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          <History className="mx-auto mb-4 h-8 w-8 text-gray-400" />
          暂无历史抓取记录。
        </div>
      )}

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <BarChart3 className="h-3.5 w-3.5" />
              统计分布
            </div>
          </div>
          <span className="text-sm font-medium text-slate-600">展开</span>
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 p-4 sm:p-5 lg:grid-cols-2">
          <DashboardDistributionPanel title="批次状态" items={summary.batchStatusDistribution} emptyText="暂无批次状态数据" />
          <DashboardDistributionPanel title="公众号文章" items={summary.accountArticleDistribution} emptyText="暂无公众号文章数据" />
        </div>
      </details>

      {drawerBatch ? (
        <ArticleDetailDrawer
          batch={drawerBatch}
          onDownloadArticle={onDownloadArticle}
          onDownloadArticleDocx={onDownloadArticleDocx}
          onDownloadBatch={onDownloadBatch}
          onClose={onCloseDrawer}
        />
      ) : null}
    </div>
  )
}
