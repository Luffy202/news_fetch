import { AlertTriangle, Clock3, FileText, Layers3 } from 'lucide-react'

import type { DashboardSummary } from '../types/api'

type DashboardSummaryCardsProps = {
  summary: DashboardSummary
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

export default function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  const items = [
    {
      label: '项目批次',
      value: `${summary.totalBatches}`,
      icon: Layers3,
    },
    {
      label: '历史文章',
      value: `${summary.totalArticles}`,
      icon: FileText,
    },
    {
      label: '最近抓取',
      value: formatDateTime(summary.latestCrawlAt),
      icon: Clock3,
    },
    {
      label: '失败项目',
      value: `${summary.failedBatches}`,
      icon: AlertTriangle,
    },
  ]

  return (
    <section className="rounded-[1.25rem] border border-gray-200 bg-gray-50/80 p-3.5 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-500">{item.label}</div>
              <div className="truncate text-sm font-semibold text-gray-900 sm:text-[15px]">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
