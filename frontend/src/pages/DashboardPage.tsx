import DashboardDistributionPanel from '../components/DashboardDistributionPanel'
import DashboardSummaryCards from '../components/DashboardSummaryCards'
import type { DashboardSummary } from '../types/api'
import { ChartBar } from 'lucide-react'

type DashboardPageProps = {
  summary?: DashboardSummary
}

export default function DashboardPage({ summary }: DashboardPageProps) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
         <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
         </div>
         <p className="mt-4 text-sm">正在加载统计数据...</p>
      </div>
    )
  }

  if (summary.totalBatches === 0 && summary.totalArticles === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
           <ChartBar className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">暂无统计数据</h2>
        <p className="text-gray-500 max-w-md mx-auto">当前还没有爬取历史，请先到爬取工作台执行一轮爬取任务，系统将自动生成统计报表。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardSummaryCards summary={summary} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardDistributionPanel
          title="批次状态分布"
          items={summary.batchStatusDistribution}
          emptyText="暂无批次状态数据"
        />
        <DashboardDistributionPanel
          title="公众号文章分布"
          items={summary.accountArticleDistribution}
          emptyText="暂无公众号文章数据"
        />
      </div>
    </div>
  )
}
