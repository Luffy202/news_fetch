import type { DistributionItem } from '../types/api'

type DashboardDistributionPanelProps = {
  title: string
  items: DistributionItem[]
  emptyText: string
}

export default function DashboardDistributionPanel({ title, items, emptyText }: DashboardDistributionPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-gray-500">{emptyText}</div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 md:hidden">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <span className="min-w-0 flex-1 text-gray-700">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="w-2/3 px-6 py-3">名称</th>
                  <th className="px-6 py-3 text-right">数量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-700">{item.label}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
