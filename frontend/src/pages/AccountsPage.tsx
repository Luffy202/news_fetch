import { Users } from 'lucide-react'

import AccountForm from '../components/AccountForm'
import AccountList from '../components/AccountList'
import type { Account, AccountPrecheckResult, CreateAccountInput } from '../types/api'

type AccountsPageProps = {
  accounts: Account[]
  onCreate: (payload: CreateAccountInput) => Promise<void> | void
  onPrecheck: (name: string) => Promise<AccountPrecheckResult> | AccountPrecheckResult
  onToggle: (account: Account) => Promise<void> | void
  onDelete: (account: Account) => Promise<void> | void
}

export default function AccountsPage({ accounts, onCreate, onPrecheck, onToggle, onDelete }: AccountsPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 md:space-y-5">
      <section className="rounded-[1.5rem] border border-gray-200 bg-[linear-gradient(135deg,#fbfdff_0%,#f7fafc_50%,#ffffff_100%)] px-4 py-4 sm:px-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Users className="h-3.5 w-3.5 text-slate-700" />
              账号列表
            </div>
            <h2 className="text-[clamp(1.35rem,1vw+1rem,1.9rem)] font-semibold tracking-tight text-slate-900">让公众号列表保持轻、准、清楚。</h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">在这里添加或删除需要监控的微信公众号，勾选状态会同步到抓取任务中。</p>
          </div>
          <div className="self-start rounded-xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">当前账号数</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{accounts.length}</div>
          </div>
        </div>
      </section>

      <AccountForm onSubmit={onCreate} onPrecheck={onPrecheck} />

      <section className="rounded-[1.25rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800">已添加公众号列表</h3>
          <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">共 {accounts.length} 个</span>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-gray-400">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>暂无公众号，请在上方添加</p>
          </div>
        ) : (
          <AccountList accounts={accounts} onToggle={onToggle} onDelete={onDelete} />
        )}
      </section>
    </div>
  )
}
