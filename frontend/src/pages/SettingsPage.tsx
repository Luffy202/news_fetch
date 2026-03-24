import { useEffect, useState } from 'react'
import { Save, Settings as SettingsIcon, MessageSquare, Clock, Laptop2, AlertTriangle, CheckCircle2, Globe } from 'lucide-react'

import type { Settings, BootstrapStatus } from '../types/api'

type SettingsPageProps = {
  settings?: Settings
  bootstrap?: BootstrapStatus
  onSave: (payload: Partial<Pick<Settings, 'feishuWebhook' | 'proxyUrl' | 'articleCount' | 'requestInterval'>>) => Promise<void> | void
}

export default function SettingsPage({ settings, bootstrap, onSave }: SettingsPageProps) {
  const [feishuWebhook, setFeishuWebhook] = useState(settings?.feishuWebhook ?? '')
  const [proxyUrl, setProxyUrl] = useState(settings?.proxyUrl ?? '')
  const [requestInterval, setRequestInterval] = useState(settings?.requestInterval ?? 4)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setFeishuWebhook(settings.feishuWebhook ?? '')
      setProxyUrl(settings.proxyUrl ?? '')
      setRequestInterval(settings.requestInterval ?? 4)
    }
  }, [settings])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        feishuWebhook,
        proxyUrl,
        requestInterval,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-gray-100 bg-white text-gray-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
        <p className="mt-4 text-sm">正在加载设置...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 md:space-y-5">
      <section className="rounded-[1.5rem] border border-gray-200 bg-[linear-gradient(135deg,#fbfdff_0%,#f7fafc_45%,#ffffff_100%)] px-4 py-4 sm:px-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 text-slate-700" />
              运行配置
            </div>
            <h2 className="text-[clamp(1.35rem,1vw+1rem,1.9rem)] font-semibold tracking-tight text-slate-900">保持环境状态稳定，也让设置页更从容。</h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">查看当前环境状态，配置爬取参数和消息通知服务。</p>
          </div>
          <div className="self-start rounded-xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">当前请求间隔</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{requestInterval} 秒</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.25rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Laptop2 className="h-5 w-5 text-gray-500" />
            环境就绪状态
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
              <div className="space-y-2 text-sm text-gray-600">
                <div>当前消息：{bootstrap?.message ?? '正在检查环境...'}</div>
                <div>前端托管：{bootstrap?.frontendHosted ? '已由后端托管' : '尚未就绪'}</div>
                <div>扫码能力：{bootstrap?.visualLoginMessage ?? '尚未检测'}</div>
              </div>
            </div>

            {bootstrap?.blockingIssues?.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  当前有待处理项
                </div>
                <div className="space-y-1">
                  {bootstrap.blockingIssues.map((issue) => (
                    <div key={issue}>- {issue}</div>
                  ))}
                  {bootstrap.lastStartupError ? <div>- 最近启动错误：{bootstrap.lastStartupError}</div> : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                启动链路已就绪，各项配置正常。
              </div>
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-[1.25rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                飞书 Webhook
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-all placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={feishuWebhook}
                onChange={(event) => setFeishuWebhook(event.target.value)}
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              />
              <p className="mt-1 text-xs text-gray-500">用于接收爬取完成通知和数据推送的飞书群组机器人地址。</p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4 text-gray-400" />
                网络代理
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-all placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={proxyUrl}
                onChange={(event) => setProxyUrl(event.target.value)}
                placeholder="http://127.0.0.1:7890"
              />
              <p className="mt-1 text-xs text-gray-500">默认直连且不继承系统代理，如需代理请显式填写 HTTP 或 HTTPS 代理地址。</p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 text-gray-400" />
                请求间隔（秒）
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={requestInterval}
                onChange={(event) => setRequestInterval(Number(event.target.value))}
              />
              <p className="mt-1 text-xs text-gray-500">爬虫请求之间的等待时间，防止被封禁。</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
