import { useEffect, useState } from 'react'
import { Save, Settings as SettingsIcon, MessageSquare, List, Clock } from 'lucide-react'
import type { Settings } from '../types/api'

type SettingsPageProps = {
  settings?: Settings
  onSave: (payload: Partial<Pick<Settings, 'feishuWebhook' | 'articleCount' | 'requestInterval'>>) => Promise<void> | void
}

export default function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [feishuWebhook, setFeishuWebhook] = useState(settings?.feishuWebhook ?? '')
  const [articleCount, setArticleCount] = useState(settings?.articleCount ?? 10)
  const [requestInterval, setRequestInterval] = useState(settings?.requestInterval ?? 4)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
       setFeishuWebhook(settings.feishuWebhook ?? '')
       setArticleCount(settings.articleCount ?? 10)
       setRequestInterval(settings.requestInterval ?? 4)
    }
  }, [settings])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        feishuWebhook,
        articleCount,
        requestInterval,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
         <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
         </div>
         <p className="mt-4 text-sm">正在加载设置...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
           <SettingsIcon className="w-6 h-6 text-blue-600" />
           系统设置
        </h2>
        <p className="text-gray-500 text-sm">配置爬取参数和消息通知服务。</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              飞书 Webhook
            </label>
            <input 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              value={feishuWebhook} 
              onChange={(event) => setFeishuWebhook(event.target.value)} 
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." 
            />
            <p className="mt-1 text-xs text-gray-500">用于接收爬取完成通知和数据推送的飞书群组机器人地址。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <List className="w-4 h-4 text-gray-400" />
                每个公众号文章数
              </label>
              <input 
                type="number" 
                min={1} 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={articleCount} 
                onChange={(event) => setArticleCount(Number(event.target.value))} 
              />
              <p className="mt-1 text-xs text-gray-500">每次爬取时获取的最新文章数量。</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                请求间隔（秒）
              </label>
              <input 
                type="number" 
                min={0} 
                step="0.5" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={requestInterval} 
                onChange={(event) => setRequestInterval(Number(event.target.value))} 
              />
              <p className="mt-1 text-xs text-gray-500">爬虫请求之间的等待时间，防止被封禁。</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  )
}
