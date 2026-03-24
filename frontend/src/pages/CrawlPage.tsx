import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ChartColumn,
  ChevronRight,
  Clock3,
  Download,
  LoaderCircle,
  PlayCircle,
  QrCode,
  Radio,
  Send,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import AccountForm from '../components/AccountForm'
import AccountList from '../components/AccountList'
import type {
  Account,
  AccountPrecheckResult,
  AuthStatus,
  Batch,
  BootstrapStatus,
  CreateAccountInput,
  Settings,
  TaskStatus,
} from '../types/api'

type CrawlPageProps = {
  bootstrap?: BootstrapStatus
  accounts: Account[]
  loginState: AuthStatus
  settings?: Settings
  currentTask: TaskStatus
  batches: Batch[]
  onCreate: (payload: CreateAccountInput) => Promise<void> | void
  onPrecheck: (name: string) => Promise<AccountPrecheckResult> | AccountPrecheckResult
  onToggle: (account: Account) => Promise<void> | void
  onLogin: (force?: boolean) => Promise<void> | void
  onStartCrawl: (articleCount: number) => Promise<void> | void
  onSelectBatch: (batchId: number) => Promise<void> | void
  onPushFeishu: (batchId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onOpenDashboard: () => void
}

const authStatusTextMap: Record<AuthStatus['loginStatus'], string> = {
  logged_out: '未登录',
  launching_browser: '启动浏览器中',
  waiting_for_scan: '等待扫码',
  verifying: '校验中',
  logged_in: '已登录',
  failed: '登录失败',
  expired: '登录失效',
}

const batchStatusTextMap: Record<Batch['status'], string> = {
  waiting: '等待中',
  running: '抓取中',
  completed: '已完成',
  failed: '失败',
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '暂无记录'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.replace('T', ' ').replace(/\.\d+Z?$/, '')
  }

  return parsed.toLocaleString('zh-CN', { hour12: false })
}

function statusChipClass(status: Batch['status']) {
  if (status === 'completed') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'running') {
    return 'bg-blue-100 text-blue-700'
  }
  if (status === 'failed') {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-gray-100 text-gray-700'
}

export default function CrawlPage({
  bootstrap,
  accounts,
  loginState,
  settings,
  currentTask,
  batches,
  onCreate,
  onPrecheck,
  onToggle,
  onLogin,
  onStartCrawl,
  onSelectBatch,
  onPushFeishu,
  onDownloadBatch,
  onOpenDashboard,
}: CrawlPageProps) {
  const [articleCount, setArticleCount] = useState(settings?.articleCount ?? 10)

  useEffect(() => {
    if (settings) {
      setArticleCount(settings.articleCount ?? 10)
    }
  }, [settings])

  const selectedAccounts = accounts.filter((account) => account.isSelected)
  const latestBatch = batches[0]
  const recentBatches = batches.slice(0, 5)
  const canDownloadLatestBatch = latestBatch?.status === 'completed'

  const settingsReady = Boolean(settings)
  const environmentReady = Boolean(bootstrap) && bootstrap.blockingIssues.length === 0
  const loginReady = loginState.loginStatus === 'logged_in'
  const selectionReady = selectedAccounts.length > 0
  const isRunning = currentTask.status === 'running'

  let startBlockedReason = ''
  if (!settingsReady) {
    startBlockedReason = '正在加载抓取设置。'
  } else if (!environmentReady) {
    startBlockedReason = bootstrap?.blockingIssues[0] ?? '请先完成环境准备。'
  } else if (!loginReady) {
    startBlockedReason = loginState.message || '请先完成微信登录。'
  } else if (!selectionReady) {
    startBlockedReason = '请至少选择一个公众号。'
  } else if (isRunning) {
    startBlockedReason = '当前任务正在执行，请稍候。'
  }

  const prepStatusTone = !environmentReady
    ? 'warning'
    : loginReady
      ? 'ready'
      : loginState.loginStatus === 'failed' || loginState.loginStatus === 'expired'
        ? 'warning'
        : 'pending'

  const prepStatusTitle =
    prepStatusTone === 'ready'
      ? '可以开始抓取'
      : prepStatusTone === 'warning'
        ? '需要处理异常'
        : '先完成微信登录'

  const prepStatusDescription = !environmentReady
    ? bootstrap?.message ?? startBlockedReason
    : loginReady
      ? `最近登录：${formatDateTime(loginState.lastLoginAt)}`
      : loginState.message

  const prepActionLabel =
    loginState.loginStatus === 'failed' || loginState.loginStatus === 'expired'
      ? '重新登录'
      : loginReady
        ? '重新登录'
        : loginState.loginStatus === 'waiting_for_scan' || loginState.loginStatus === 'verifying' || loginState.loginStatus === 'launching_browser'
          ? '等待完成'
          : '微信登录'

  const prepActionDisabled =
    (!loginState.canRetry && !loginReady)
    || loginState.loginStatus === 'waiting_for_scan'
    || loginState.loginStatus === 'verifying'
    || loginState.loginStatus === 'launching_browser'

  const taskStatusText = isRunning ? '抓取中' : currentTask.nextAction === 'start_crawl' ? '待开始' : '待处理'
  const progressPercent = Math.max(currentTask.progressPercent ?? 0, isRunning ? 8 : 0)

  const handleOpenBatchInDashboard = async (batchId: number) => {
    await onSelectBatch(batchId)
    onOpenDashboard()
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="rounded-[1.5rem] border border-gray-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf7_55%,#ffffff_100%)] px-4 py-4 sm:px-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              启动向导
            </div>
            <h2 className="text-[clamp(1.35rem,1vw+1.05rem,2rem)] font-semibold tracking-tight text-slate-900">登录、选公众号、开始抓取。</h2>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="min-w-[7.5rem] rounded-xl border border-white bg-white/85 px-3.5 py-2.5 shadow-sm">
              <div className="text-xs text-slate-500">已选公众号</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{selectedAccounts.length}</div>
            </div>
            <div className="min-w-[7.5rem] rounded-xl border border-white bg-white/85 px-3.5 py-2.5 shadow-sm">
              <div className="text-xs text-slate-500">当前状态</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{taskStatusText}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {prepStatusTone === 'warning' ? <TriangleAlert className="h-3.5 w-3.5 text-amber-600" /> : <Radio className="h-3.5 w-3.5 text-emerald-600" />}
              准备状态
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{prepStatusTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{prepStatusDescription}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                运行模式：{bootstrap?.runMode === 'docker' ? 'Docker' : '本地'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                登录状态：{authStatusTextMap[loginState.loginStatus]}
              </span>
            </div>

            {!environmentReady && bootstrap?.blockingIssues.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {bootstrap.blockingIssues.join('；')}
              </div>
            ) : null}

            {loginState.lastError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loginState.lastError}
              </div>
            ) : null}
          </div>

          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:max-w-[17rem] xl:w-[15.5rem] xl:flex-none">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">操作</div>
            <button
              type="button"
              onClick={() => onLogin(loginReady || loginState.loginStatus === 'failed' || loginState.loginStatus === 'expired')}
              disabled={prepActionDisabled}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                prepActionDisabled ? 'cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {loginState.loginStatus === 'waiting_for_scan' || loginState.loginStatus === 'verifying' || loginState.loginStatus === 'launching_browser' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : loginReady ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {prepActionLabel}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <PlayCircle className="h-3.5 w-3.5" />
                  抓取配置
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">选择公众号并开始抓取</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">共 {accounts.length} 个</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">已选 {selectedAccounts.length} 个</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">抓取文章数 {articleCount}</span>
              </div>
            </div>

            <div className="mt-4">
              <AccountForm onSubmit={onCreate} onPrecheck={onPrecheck} variant="embedded" />
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">抓取参数</div>
                  <p className="mt-1 text-sm text-slate-600">在启动前直接设置本轮每个公众号抓取的文章数，保存后会写回系统配置。</p>
                </div>
                <div className="w-full md:w-52">
                  <label className="mb-1 block text-sm font-medium text-slate-700">抓取文章数</label>
                  <input
                    type="number"
                    min={1}
                    value={articleCount}
                    onChange={(event) => setArticleCount(Math.max(1, Number(event.target.value) || 1))}
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-slate-500">
                  先添加公众号。
                </div>
              ) : (
                <AccountList accounts={accounts} onToggle={onToggle} />
              )}
            </div>
          </div>

          <aside className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-6 xl:max-w-[19rem] xl:flex-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">抓取面板</div>
                <div className="mt-1.5 text-lg font-semibold text-slate-900">{taskStatusText}</div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                {currentTask.completedAccounts ?? 0} / {currentTask.totalAccounts ?? selectedAccounts.length}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-2">
              <div className="rounded-xl border border-white bg-white p-3 shadow-sm">
                <div className="text-xs text-slate-500">文章数</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{currentTask.totalArticles ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white bg-white p-3 shadow-sm">
                <div className="text-xs text-slate-500">下一步</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{selectionReady ? (isRunning ? '等待完成' : '可以开始') : '先选公众号'}</div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <div>当前动作：{currentTask.message ?? '暂无任务'}</div>
              <div>当前公众号：{currentTask.currentAccountName ?? '尚未开始'}</div>
              <div>待处理：{currentTask.pendingAccounts?.length ? currentTask.pendingAccounts.join('、') : '无'}</div>
            </div>

            {startBlockedReason ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {startBlockedReason}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => onStartCrawl(articleCount)}
              disabled={Boolean(startBlockedReason)}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                startBlockedReason ? 'cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              {isRunning ? '抓取中' : '开始抓取'}
            </button>

            <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <summary className="list-none cursor-pointer text-sm font-medium text-slate-700">
                进度日志
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{currentTask.events.length}</span>
              </summary>
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto font-mono text-xs">
                {currentTask.events.length === 0 ? (
                  <div className="text-slate-400">暂无日志</div>
                ) : (
                  currentTask.events.slice().reverse().map((event) => (
                    <div key={event.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-400">{event.createdAt?.split('T')[1]?.split('.')[0]}</div>
                      <div
                        className={
                          event.level === 'error'
                            ? 'mt-1 text-red-600'
                            : event.level === 'warning'
                              ? 'mt-1 text-amber-600'
                              : 'mt-1 text-slate-600'
                        }
                      >
                        {event.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
          </aside>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <ChartColumn className="h-3.5 w-3.5" />
              最新项目批次
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">查看最新批次情况</h3>
          </div>

          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
          >
            进入结果看板
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {!latestBatch ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-slate-500">
            暂无抓取记录。
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 2xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-xl border border-gray-200 bg-[linear-gradient(135deg,#fafcff_0%,#ffffff_100%)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      最新项目批次 #{latestBatch.batchNo ?? latestBatch.id}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusChipClass(latestBatch.status)}`}>
                      {batchStatusTextMap[latestBatch.status]}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatDateTime(latestBatch.startedAt)}
                    </span>
                    <span>文章：{latestBatch.totalArticles}</span>
                    <span>公众号：{latestBatch.completedAccounts}/{latestBatch.totalAccounts}</span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void handleOpenBatchInDashboard(latestBatch.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto"
                  >
                    查看结果
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadBatch(latestBatch.id)}
                    disabled={!canDownloadLatestBatch}
                    title={canDownloadLatestBatch ? '下载 ZIP' : '仅支持导出已完成批次'}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors sm:w-auto ${
                      canDownloadLatestBatch
                        ? 'border border-gray-200 text-slate-700 hover:border-blue-200 hover:text-blue-700'
                        : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    下载 ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => onPushFeishu(latestBatch.id)}
                    disabled={!settings?.feishuWebhook || latestBatch.status !== 'completed'}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors sm:w-auto ${
                      !settings?.feishuWebhook || latestBatch.status !== 'completed'
                        ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    推送飞书
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">项目批次历史</h4>
                <span className="text-xs text-slate-400">最近 {recentBatches.length} 条</span>
              </div>
              <div className="mt-4 space-y-3">
                {recentBatches.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => void handleOpenBatchInDashboard(batch.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-200"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">#{batch.batchNo ?? batch.id}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusChipClass(batch.status)}`}>
                          {batchStatusTextMap[batch.status]}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(batch.startedAt)} · 文章 {batch.totalArticles}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
