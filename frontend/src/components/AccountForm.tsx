import { FormEvent, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'

import type { AccountCandidate, AccountPrecheckResult, CreateAccountInput } from '../types/api'

type AccountFormProps = {
  onSubmit: (payload: CreateAccountInput) => Promise<void> | void
  onPrecheck: (name: string) => Promise<AccountPrecheckResult> | AccountPrecheckResult
  variant?: 'card' | 'embedded'
}

export default function AccountForm({ onSubmit, onPrecheck, variant = 'card' }: AccountFormProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidates, setCandidates] = useState<AccountCandidate[]>([])

  const isBusy = isSubmitting || isChecking

  const resetCandidateDialog = () => {
    setCandidateQuery('')
    setCandidates([])
  }

  const commitAccount = async (payload: CreateAccountInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit(payload)
      setName('')
      resetCandidateDialog()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePickCandidate = async (candidate: AccountCandidate) => {
    await commitAccount({
      name: candidateQuery,
      resolvedName: candidate.nickname,
      fakeid: candidate.fakeid,
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = name.trim()
    if (!query || isBusy) {
      return
    }

    setIsChecking(true)
    try {
      const result = await onPrecheck(query)
      if (result.status === 'exact_match') {
        await commitAccount({
          name: query,
          resolvedName: result.exactMatch.nickname,
          fakeid: result.exactMatch.fakeid,
        })
        return
      }

      setCandidateQuery(query)
      setCandidates(result.candidates)
    } finally {
      setIsChecking(false)
    }
  }

  const shellClassName =
    variant === 'embedded'
      ? 'flex flex-col gap-3 rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center'
      : 'mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6'

  return (
    <form onSubmit={handleSubmit} className={shellClassName}>
      <div className="flex-1">
        <label htmlFor="account-name" className="sr-only">
          公众号名称
        </label>
        <input
          id="account-name"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入公众号名称，回车或点击右侧按钮添加"
          disabled={isBusy}
        />
      </div>
      <button
        type="submit"
        disabled={isBusy || !name.trim()}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      >
        {isChecking ? <Search className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        {isChecking ? '预检中...' : isSubmitting ? '添加中...' : '添加'}
      </button>

      {candidates.length > 0 ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm" onClick={resetCandidateDialog} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">请选择匹配的公众号</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">未找到完全一致的名称，请从以下模糊匹配结果中确认一个公众号。</p>
              </div>
              <button
                type="button"
                onClick={resetCandidateDialog}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              当前输入：{candidateQuery}
            </div>

            <div className="mt-5 space-y-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.fakeid}
                  type="button"
                  onClick={() => void handlePickCandidate(candidate)}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{candidate.nickname}</div>
                    <div className="mt-1 text-xs text-slate-500">fakeid: {candidate.fakeid}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <Check className="h-3.5 w-3.5" />
                    选择
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={resetCandidateDialog}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </>
      ) : null}
    </form>
  )
}
