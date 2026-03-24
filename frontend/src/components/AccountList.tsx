import { Check, Trash2 } from 'lucide-react'
import type { Account } from '../types/api'

type AccountListProps = {
  accounts: Account[]
  onToggle: (account: Account) => Promise<void> | void
  onDelete?: (account: Account) => Promise<void> | void
}

export default function AccountList({ accounts, onToggle, onDelete }: AccountListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className={`group relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
            account.isSelected ? 'border-slate-900/10 bg-slate-50 shadow-sm' : 'border-gray-200 bg-white hover:border-slate-300'
          }`}
          onClick={() => onToggle(account)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                account.isSelected ? 'border-slate-900 bg-slate-900' : 'border-gray-300 bg-white'
              }`}
            >
              {account.isSelected ? <Check className="h-3.5 w-3.5 text-white" /> : null}
            </div>
            <span className={`truncate text-sm font-medium ${account.isSelected ? 'text-slate-900' : 'text-gray-700'}`}>
              {account.name}
            </span>
          </div>

          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDelete(account)
              }}
              className="rounded-lg p-1.5 text-gray-400 opacity-100 transition-colors hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
