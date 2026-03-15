import { Play, Loader2 } from 'lucide-react'
import type { TaskStatus } from '../types/api'

type TaskStatusPanelProps = {
  task: TaskStatus
  onStart: () => Promise<void> | void
  disabled?: boolean
}

export default function TaskStatusPanel({ task, onStart, disabled = false }: TaskStatusPanelProps) {
  const isRunning = task.status === 'running'

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Loader2 className={`w-5 h-5 text-blue-600 ${isRunning ? 'animate-spin' : ''}`} />
          当前任务
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-gray-50 p-3 rounded-lg">
             <div className="text-xs text-gray-500 mb-1">进度</div>
             <div className="font-semibold text-gray-900">{task.completedAccounts ?? 0} / {task.totalAccounts ?? 0}</div>
           </div>
           <div className="bg-gray-50 p-3 rounded-lg">
             <div className="text-xs text-gray-500 mb-1">文章数</div>
             <div className="font-semibold text-gray-900">{task.totalArticles ?? 0}</div>
           </div>
        </div>
        
        <div className="space-y-2 text-sm">
           <div className="flex justify-between">
             <span className="text-gray-500">状态</span>
             <span className={`font-medium ${isRunning ? 'text-blue-600' : 'text-gray-600'}`}>
               {task.status === 'idle' ? '空闲' : isRunning ? '运行中' : task.status}
             </span>
           </div>
           {task.message && (
             <div className="text-gray-500 truncate text-xs" title={task.message}>
               {task.message}
             </div>
           )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStart()}
        disabled={disabled || isRunning}
        className={`mt-6 w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
           isRunning 
             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
             : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <Play className="w-4 h-4" />
        {isRunning ? '任务进行中' : '开始爬取'}
      </button>
    </div>
  )
}
