import type { DistributionItem } from '../types/api'

type DashboardDistributionPanelProps = {
  title: string
  items: DistributionItem[]
  emptyText: string
}

export default function DashboardDistributionPanel({ title, items, emptyText }: DashboardDistributionPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
         <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      
      {items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 flex-1 flex items-center justify-center">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-2/3">名称</th>
                <th className="px-6 py-3 text-right">数量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-700">{item.label}</td>
                  <td className="px-6 py-3 text-right text-gray-900 font-semibold">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
