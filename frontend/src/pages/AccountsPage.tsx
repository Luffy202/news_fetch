import { Users } from 'lucide-react'
import AccountForm from '../components/AccountForm'
import AccountList from '../components/AccountList'
import type { Account } from '../types/api'

type AccountsPageProps = {
  accounts: Account[]
  onCreate: (name: string) => Promise<void> | void
  onToggle: (account: Account) => Promise<void> | void
  onDelete: (account: Account) => Promise<void> | void
}

export default function AccountsPage({ accounts, onCreate, onToggle, onDelete }: AccountsPageProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
           <Users className="w-6 h-6 text-blue-600" />
           公众号管理
        </h2>
        <p className="text-gray-500 text-sm">在这里添加或删除需要监控的微信公众号，勾选状态会同步到爬取任务中。</p>
      </div>
      
      <AccountForm onSubmit={onCreate} />
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-semibold text-gray-800">已添加公众号列表</h3>
           <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
             共 {accounts.length} 个
           </span>
        </div>
        
        {accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>暂无公众号，请在上方添加</p>
          </div>
        ) : (
          <AccountList accounts={accounts} onToggle={onToggle} onDelete={onDelete} />
        )}
      </div>
    </div>
  )
}
