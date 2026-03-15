import type { TaskEvent } from '../types/api'

type TaskEventListProps = {
  events: TaskEvent[]
}

export default function TaskEventList({ events }: TaskEventListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-800 text-sm">进度日志</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{events.length} 条记录</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>暂无日志</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex gap-3 hover:bg-gray-50 p-1 rounded -mx-1 transition-colors">
               <span className="text-gray-400 flex-shrink-0 w-[70px]">{event.createdAt?.split('T')[1]?.split('.')[0]}</span>
               <span className={`flex-1 break-all ${
                 event.level === 'error' ? 'text-red-600 font-medium' : 
                 event.level === 'warning' ? 'text-amber-600' : 'text-gray-600'
               }`}>
                 {event.message}
               </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
