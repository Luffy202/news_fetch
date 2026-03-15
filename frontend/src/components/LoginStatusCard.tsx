import { LogIn, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { Settings } from '../types/api'

type LoginStatusCardProps = {
  loginStatus: Settings['loginStatus']
  lastLoginAt?: string | null
  onLogin: () => Promise<void> | void
  disabled?: boolean
}

const statusTextMap: Record<Settings['loginStatus'], string> = {
  logged_out: '未登录',
  logging_in: '登录中',
  logged_in: '已登录',
  expired: '已失效',
}

export default function LoginStatusCard({ loginStatus, lastLoginAt, onLogin, disabled = false }: LoginStatusCardProps) {
  const isLogged = loginStatus === 'logged_in'
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <LogIn className="w-5 h-5 text-blue-600" />
          登录状态
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">当前状态</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${
              isLogged 
                ? 'bg-green-50 text-green-700' 
                : loginStatus === 'logging_in'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isLogged ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {statusTextMap[loginStatus]}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">最近登录</span>
            <span className="text-gray-900 font-medium text-sm flex items-center gap-1.5">
               <Clock className="w-3.5 h-3.5 text-gray-400" />
               {lastLoginAt ?? '暂无记录'}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onLogin()}
        disabled={disabled || loginStatus === 'logging_in'}
        className="mt-6 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {loginStatus === 'logging_in' ? '登录中...' : '扫码登录'}
      </button>
    </div>
  )
}
