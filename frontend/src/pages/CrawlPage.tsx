import { type ReactNode, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  LoaderCircle,
  PlayCircle,
  QrCode,
  Sparkles,
} from 'lucide-react'

import AccountForm from '../components/AccountForm'
import AccountList from '../components/AccountList'
import ArticleDetailDrawer from '../components/ArticleDetailDrawer'
import BatchHistoryTable from '../components/BatchHistoryTable'
import FeishuPushPanel from '../components/FeishuPushPanel'
import TaskEventList from '../components/TaskEventList'
import type { Account, AuthStatus, Batch, BatchDetail, BootstrapStatus, Settings, TaskStatus } from '../types/api'

type CrawlPageProps = {
  bootstrap?: BootstrapStatus
  accounts: Account[]
  loginState: AuthStatus
  settings?: Settings
  currentTask: TaskStatus
  batches: Batch[]
  selectedBatch?: BatchDetail
  onCreate: (name: string) => Promise<void> | void
  onToggle: (account: Account) => Promise<void> | void
  onLogin: () => Promise<void> | void
  onStartCrawl: () => Promise<void> | void
  onSelectBatch: (batchId: number) => Promise<void> | void
  onCloseBatchDetail: () => void
  onPushFeishu: (batchId: number) => Promise<void> | void
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
}

const authStatusTextMap: Record<AuthStatus['loginStatus'], string> = {
  logged_out: '未登录',
  launching_browser: '正在启动浏览器',
  waiting_for_scan: '等待扫码',
  verifying: '校验中',
  logged_in: '已登录',
  failed: '登录失败',
  expired: '登录已失效',
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

  return parsed.toLocaleString('zh-CN', {
    hour12: false,
  })
}

function StepBadge({ index, done }: { index: number; done: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
        done ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : index}
    </div>
  )
}

function StepShell({
  index,
  title,
  description,
  done,
  children,
}: {
  index: number
  title: string
  description: string
  done: boolean
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-4">
        <StepBadge index={index} done={done} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function CrawlPage({
  bootstrap,
  accounts,
  loginState,
  settings,
  currentTask,
  batches,
  selectedBatch,
  onCreate,
  onToggle,
  onLogin,
  onStartCrawl,
  onSelectBatch,
  onCloseBatchDetail,
  onPushFeishu,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
}: CrawlPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (selectedBatch) {
      setIsDrawerOpen(true)
    }
  }, [selectedBatch])

  const selectedAccounts = accounts.filter((account) => account.isSelected)
  const latestBatch = batches[0]
  const latestBatchDetail = selectedBatch && latestBatch && selectedBatch.id === latestBatch.id ? selectedBatch : undefined

  const environmentReady = Boolean(bootstrap) && bootstrap.blockingIssues.length === 0
  const loginReady = loginState.loginStatus === 'logged_in'
  const selectionReady = selectedAccounts.length > 0
  const hasResults = batches.length > 0
  const isRunning = currentTask.status === 'running'

  let startBlockedReason = ''
  if (!environmentReady) {
    startBlockedReason = bootstrap?.blockingIssues[0] ?? '请先完成环境准备。'
  } else if (!loginReady) {
    startBlockedReason = loginState.message || '请先完成微信登录。'
  } else if (!selectionReady) {
    startBlockedReason = '请先勾选至少一个公众号。'
  } else if (isRunning) {
    startBlockedReason = '当前任务正在执行，请稍候。'
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    onCloseBatchDetail()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-cyan-50 to-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              一键启动后的默认工作台
            </div>
            <h2 className="text-2xl font-bold text-gray-900">从启动到结果查看，一条线走完</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              当前建议动作：{currentTask.message ?? bootstrap?.message ?? '先检查环境状态，然后完成微信登录。'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-gray-500">运行模式</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{bootstrap?.runMode === 'docker' ? 'Docker' : '本地单机'}</div>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-gray-500">登录状态</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{authStatusTextMap[loginState.loginStatus]}</div>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-gray-500">已勾选公众号</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{selectedAccounts.length}</div>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-gray-500">最近批次</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{latestBatch ? batchStatusTextMap[latestBatch.status] : '暂无记录'}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6">
        <StepShell
          index={1}
          title="微信登录"
          description="使用扫码登录拿到公众号后台凭证。登录流程改为异步执行，页面会持续刷新状态。"
          done={loginReady}
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500">当前状态</div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    {loginState.loginStatus === 'waiting_for_scan' || loginState.loginStatus === 'verifying' ? (
                      <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
                    ) : loginReady ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <QrCode className="h-5 w-5 text-blue-600" />
                    )}
                    {authStatusTextMap[loginState.loginStatus]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onLogin()}
                  disabled={!loginState.canRetry}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    loginState.canRetry
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  {loginReady ? '已登录' : loginState.loginStatus === 'failed' || loginState.loginStatus === 'expired' ? '重新扫码登录' : '开始微信登录'}
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-600">{loginState.message}</div>
              <div className="mt-2 text-xs text-gray-500">最近登录：{formatDateTime(loginState.lastLoginAt)}</div>
              {loginState.lastError && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loginState.lastError}</div>}
            </div>
          </div>
        </StepShell>
      </div>

      <StepShell
        index={2}
        title="选择公众号"
        description="在同一页完成新增和勾选，避免来回切页面。这里勾选的就是本轮抓取目标。"
        done={selectionReady}
      >
        <div className="space-y-5">
          <AccountForm onSubmit={onCreate} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">已添加公众号</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{accounts.length}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">本轮已勾选</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{selectedAccounts.length}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">下一步</div>
              <div className="mt-2 text-sm font-medium text-gray-900">
                {selectionReady ? '可以直接开始抓取' : '先勾选至少一个公众号'}
              </div>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              还没有公众号。先添加一个你常用的公众号名称，再勾选它进入本轮抓取。
            </div>
          ) : (
            <AccountList accounts={accounts} onToggle={onToggle} />
          )}
        </div>
      </StepShell>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <StepShell
          index={3}
          title="开始抓取"
          description="只保留一个主操作按钮，并把为什么不能点说清楚。"
          done={currentTask.status === 'idle' && environmentReady && loginReady && selectionReady}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">任务状态</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {isRunning ? '抓取中' : currentTask.nextAction === 'start_crawl' ? '准备就绪' : '待处理'}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">进度</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {currentTask.completedAccounts ?? 0} / {currentTask.totalAccounts ?? selectedAccounts.length}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">文章数</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">{currentTask.totalArticles ?? 0}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gray-100">
              <div
                className="h-3 rounded-2xl bg-blue-600 transition-all"
                style={{ width: `${Math.max(currentTask.progressPercent ?? 0, isRunning ? 8 : 0)}%` }}
              />
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2 text-sm text-gray-600">
                  <div>当前动作：{currentTask.message ?? '暂无任务'}</div>
                  <div>当前公众号：{currentTask.currentAccountName ?? '尚未开始'}</div>
                  <div>待处理公众号：{currentTask.pendingAccounts?.length ? currentTask.pendingAccounts.join('、') : '无'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartCrawl()}
                  disabled={Boolean(startBlockedReason)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                    startBlockedReason
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlayCircle className="h-4 w-4" />
                  {isRunning ? '任务进行中' : '开始抓取'}
                </button>
              </div>
              {startBlockedReason && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{startBlockedReason}</div>}
            </div>
          </div>
        </StepShell>

        <div className="min-h-[320px]">
          <TaskEventList events={currentTask.events} />
        </div>
      </div>

      <StepShell
        index={4}
        title="查看结果与推送"
        description="最新一轮结果优先展示，点开后可以继续看详情、下载或推送飞书。"
        done={hasResults}
      >
        <div className="space-y-6">
          {latestBatch ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        最近批次 #{latestBatch.batchNo ?? latestBatch.id}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {batchStatusTextMap[latestBatch.status]}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <Clock3 className="h-4 w-4" />
                      开始时间：{formatDateTime(latestBatch.startedAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectBatch(latestBatch.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      查看详情
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadBatch(latestBatch.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      下载 ZIP
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">完成公众号</div>
                    <div className="mt-2 text-xl font-semibold text-gray-900">
                      {latestBatch.completedAccounts} / {latestBatch.totalAccounts}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">文章总数</div>
                    <div className="mt-2 text-xl font-semibold text-gray-900">{latestBatch.totalArticles}</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">飞书配置</div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      {settings?.feishuWebhook ? '已配置，可直接推送' : '未配置，请先去系统设置填写 Webhook'}
                    </div>
                  </div>
                </div>
              </div>

              {latestBatchDetail ? (
                <FeishuPushPanel batch={latestBatchDetail} onPush={onPushFeishu} />
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                  点“查看详情”后，这里会展示当前批次的推送入口与文章详情抽屉。
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              还没有历史批次。完成一次抓取后，这里会自动出现最近结果和快捷操作。
            </div>
          )}

          <BatchHistoryTable
            batches={batches}
            selectedBatchId={selectedBatch?.id}
            onSelect={onSelectBatch}
            onDownloadBatch={onDownloadBatch}
          />
        </div>
      </StepShell>

      {isDrawerOpen && selectedBatch && (
        <ArticleDetailDrawer
          batch={selectedBatch}
          onDownloadArticle={onDownloadArticle}
          onDownloadArticleDocx={onDownloadArticleDocx}
          onDownloadBatch={onDownloadBatch}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  )
}
