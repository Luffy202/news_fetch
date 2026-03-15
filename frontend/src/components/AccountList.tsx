import { Check, Trash2 } from 'lucide-react'
import type { Account } from '../types/api'

type AccountListProps = {
  accounts: Account[]
  onToggle: (account: Account) => Promise<void> | void
  onDelete?: (account: Account) => Promise<void> | void
}

export default function AccountList({ accounts, onToggle, onDelete }: AccountListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {accounts.map((account) => (
        <div 
          key={account.id}
          className={`
            relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none group
            ${account.isSelected 
               ? 'bg-blue-50 border-blue-200 shadow-sm' 
               : 'bg-white border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => onToggle(account)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`
              w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors
              ${account.isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}
            `}>
              {account.isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className={`font-medium truncate text-sm ${account.isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
              {account.name}
            </span>
          </div>
          
          {onDelete && (
             <button 
               type="button" 
               onClick={(e) => {
                 e.stopPropagation()
                 onDelete(account)
               }}
               className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
               title="删除"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          )}
        </div>
      ))}
    </div>
  )
}
