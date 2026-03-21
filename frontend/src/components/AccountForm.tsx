import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

type AccountFormProps = {
  onSubmit: (name: string) => Promise<void> | void
  variant?: 'card' | 'embedded'
}

export default function AccountForm({ onSubmit, variant = 'card' }: AccountFormProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(trimmed)
      setName('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const shellClassName =
    variant === 'embedded'
      ? 'flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4'
      : 'mb-6 flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm'

  return (
    <form onSubmit={handleSubmit} className={shellClassName}>
      <div className="flex-1">
        <label htmlFor="account-name" className="sr-only">
          公众号名称
        </label>
        <input
          id="account-name"
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入公众号名称，回车或点击右侧按钮添加"
          disabled={isSubmitting}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        <Plus className="h-5 w-5" />
        {isSubmitting ? '添加中...' : '添加'}
      </button>
    </form>
  )
}
