import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

type AccountFormProps = {
  onSubmit: (name: string) => Promise<void> | void
}

export default function AccountForm({ onSubmit }: AccountFormProps) {
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

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex-1">
        <label htmlFor="account-name" className="sr-only">公众号名称</label>
        <input
          id="account-name"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="请输入公众号名称"
          disabled={isSubmitting}
        />
      </div>
      <button 
        type="submit" 
        disabled={isSubmitting || !name.trim()}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
      >
        <Plus className="w-5 h-5" />
        {isSubmitting ? '添加中...' : '添加公众号'}
      </button>
    </form>
  )
}
