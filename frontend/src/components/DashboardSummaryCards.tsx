import { Users, FileText, Layers, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { DashboardSummary } from '../types/api'

type DashboardSummaryCardsProps = {
  summary: DashboardSummary
}

export default function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  const cards = [
    { label: '公众号总数', value: summary.totalAccounts, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '本轮勾选数', value: summary.selectedAccounts, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: '文章总数', value: summary.totalArticles, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '批次总数', value: summary.totalBatches, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '成功批次', value: summary.successfulBatches, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: '失败批次', value: summary.failedBatches, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
         <Clock className="w-4 h-4" />
         最近爬取时间：<span className="font-medium text-gray-700">{summary.latestCrawlAt ?? '暂无'}</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className={`p-3 rounded-lg ${card.bg}`}>
               <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
               <p className="text-sm text-gray-500 font-medium">{card.label}</p>
               <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
