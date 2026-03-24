import type { TaskEvent } from '../types/api'

type TaskEventListProps = {
  events: TaskEvent[]
}

export default function TaskEventList({ events }: TaskEventListProps) {
  return (
    <div className="flex h-[min(20rem,52dvh)] min-h-[14rem] flex-col rounded-[1.25rem] border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-800">进度日志</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{events.length} 条记录</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4 font-mono text-xs">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p>暂无日志</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="mx-[-0.25rem] flex gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50">
              <span className="w-[70px] flex-shrink-0 text-gray-400">{event.createdAt?.split('T')[1]?.split('.')[0]}</span>
              <span
                className={`flex-1 break-words ${
                  event.level === 'error'
                    ? 'font-medium text-red-600'
                    : event.level === 'warning'
                      ? 'text-amber-600'
                      : 'text-gray-600'
                }`}
              >
                {event.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
