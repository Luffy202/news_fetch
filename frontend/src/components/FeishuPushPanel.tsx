import { Send } from 'lucide-react'
import type { BatchDetail } from '../types/api'

type FeishuPushPanelProps = {
  batch?: BatchDetail
  onPush: (batchId: number) => Promise<void> | void
}

export default function FeishuPushPanel({ batch, onPush }: FeishuPushPanelProps) {
  if (!batch) return null

  const disabled = batch.status !== 'completed'

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
       <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="space-y-2">
             <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
               <Send className="w-5 h-5 text-green-600" />
               飞书推送
             </h3>
             <p className="text-sm text-gray-600">
               推送范围：当前批次 ({batch.batchNo}) 的文章结果
             </p>
             <div className="flex gap-4 text-sm text-gray-600">
               <span className="flex items-center gap-1">
                 状态: 
                 <span className={`font-medium ${batch.feishuPushStatus === 'pushed' ? 'text-green-600' : 'text-gray-600'}`}>
                    {batch.feishuPushStatus ?? '未推送'}
                 </span>
               </span>
               <span className="flex items-center gap-1">
                 时间: {batch.feishuPushedAt ?? '暂无'}
               </span>
             </div>
          </div>
          
          <button 
            type="button" 
            disabled={disabled} 
            onClick={() => onPush(batch.id)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Send className="w-4 h-4" />
            推送到飞书
          </button>
       </div>
    </div>
  )
}
