import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ChartBar,
  LayoutDashboard,
  Menu,
  Search,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react'

import AccountsPage from './pages/AccountsPage'
import CrawlPage from './pages/CrawlPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import {
  createAccountAction,
  precheckAccountAction,
  deleteBatchAction,
  deleteAccountAction,
  exportArticleDocx,
  exportArticleMarkdown,
  exportBatchMarkdownZip,
  initialAppState,
  loadAccounts,
  loadAuthStatus,
  loadBatchDetail,
  loadBatchHistory,
  loadBootstrapStatus,
  loadCurrentTask,
  loadDashboardSummary,
  loadSettings,
  pushCurrentBatchToFeishu,
  saveSettings,
  startCrawlAction,
  toggleAccountSelection,
  triggerLoginAction,
} from './stores/appStore'
import type {
  Account,
  AuthStatus,
  Batch,
  BatchDetail,
  BootstrapStatus,
  DashboardSummary,
  Settings,
  TaskStatus,
} from './types/api'

type ViewName = 'crawl' | 'accounts' | 'settings' | 'dashboard'

const initialLoginState: AuthStatus = {
  loginStatus: 'logged_out',
  lastLoginAt: null,
  message: '请先完成微信登录，再开始抓取。',
  lastError: null,
  canRetry: true,
}

const viewCopy: Record<ViewName, { title: string; description: string }> = {
  crawl: {
    title: '启动向导',
    description: '用更短的路径完成登录、选择公众号和抓取启动。',
  },
  accounts: {
    title: '公众号管理',
    description: '整理需要监控的账号列表，保持每轮抓取前的选择足够清晰。',
  },
  dashboard: {
    title: '抓取结果看板',
    description: '按项目批次查看结果、日志和导出动作，让信息在不同视图里依然有层次。',
  },
  settings: {
    title: '系统设置',
    description: '集中查看运行环境与通知配置，避免在窄屏下出现拥挤和跳跃。',
  },
}

export default function App() {
  const [view, setView] = useState<ViewName>('crawl')
  const [accounts, setAccounts] = useState<Account[]>(initialAppState.accounts)
  const [batches, setBatches] = useState<Batch[]>(initialAppState.batches)
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | undefined>(initialAppState.selectedBatch)
  const [drawerBatch, setDrawerBatch] = useState<BatchDetail | undefined>(undefined)
  const [currentTask, setCurrentTask] = useState<TaskStatus>(initialAppState.currentTask)
  const [loginState, setLoginState] = useState<AuthStatus>(initialLoginState)
  const [settings, setSettings] = useState<Settings | undefined>(undefined)
  const [dashboard, setDashboard] = useState<DashboardSummary | undefined>(undefined)
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | undefined>(undefined)
  const [error, setError] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  async function refreshAccounts() {
    const nextAccounts = await loadAccounts()
    setAccounts(nextAccounts)
  }

  async function refreshTaskData() {
    const selectedBatchId = selectedBatch?.id
    const drawerBatchId = drawerBatch?.id
    const [nextTask, nextBatches, nextAuth, nextSelectedBatch, nextDrawerBatch, nextDashboard] = await Promise.all([
      loadCurrentTask(),
      loadBatchHistory(),
      loadAuthStatus(),
      selectedBatchId ? loadBatchDetail(selectedBatchId).catch(() => undefined) : Promise.resolve(undefined),
      drawerBatchId ? loadBatchDetail(drawerBatchId).catch(() => undefined) : Promise.resolve(undefined),
      loadDashboardSummary(),
    ])
    setCurrentTask(nextTask)
    setBatches(nextBatches)
    setLoginState(nextAuth)
    setDashboard(nextDashboard)

    let resolvedSelectedBatch = nextSelectedBatch
    if (selectedBatchId && !resolvedSelectedBatch && nextBatches[0]) {
      resolvedSelectedBatch = await loadBatchDetail(nextBatches[0].id).catch(() => undefined)
    }
    if (selectedBatchId) {
      setSelectedBatch(resolvedSelectedBatch)
    }

    if (drawerBatchId) {
      setDrawerBatch(nextDrawerBatch)
    }
  }

  async function refreshSettings() {
    const nextSettings = await loadSettings()
    setSettings(nextSettings)
  }

  async function refreshBootstrap() {
    const nextBootstrap = await loadBootstrapStatus()
    setBootstrap(nextBootstrap)
  }

  async function refreshAll() {
    try {
      await Promise.all([refreshAccounts(), refreshTaskData(), refreshSettings(), refreshBootstrap()])
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载数据失败')
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshTaskData()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [selectedBatch?.id, drawerBatch?.id])

  useEffect(() => {
    if (view !== 'dashboard' || selectedBatch || batches.length === 0) {
      return
    }
    void handleSelectBatch(batches[0].id)
  }, [view, batches, selectedBatch?.id])

  async function handleCreate(payload: { name: string; fakeid?: string; resolvedName?: string; isSelected?: boolean }) {
    try {
      await createAccountAction(payload)
      await refreshAccounts()
      await refreshTaskData()
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '添加公众号失败')
    }
  }

  async function handleToggle(account: Account) {
    try {
      await toggleAccountSelection(account)
      await refreshAccounts()
      await refreshTaskData()
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '更新公众号失败')
    }
  }

  async function handleDelete(account: Account) {
    try {
      await deleteAccountAction(account)
      await refreshAccounts()
      await refreshTaskData()
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除公众号失败')
    }
  }

  async function handleRefreshLogin(force = false) {
    try {
      const nextAuth = await triggerLoginAction(force)
      setLoginState(nextAuth)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败')
    }
  }

  async function handleStartCrawl(articleCount: number) {
    try {
      if (settings && settings.articleCount !== articleCount) {
        const nextSettings = await saveSettings({ articleCount })
        setSettings(nextSettings)
      }
      const task = await startCrawlAction()
      setCurrentTask(task)
      await refreshTaskData()
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '启动抓取失败')
    }
  }

  async function handleSelectBatch(batchId: number) {
    try {
      const detail = await loadBatchDetail(batchId)
      setSelectedBatch(detail)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载批次详情失败')
    }
  }

  async function handleOpenBatchDrawer(batchId: number) {
    try {
      const detail = await loadBatchDetail(batchId)
      setSelectedBatch(detail)
      setDrawerBatch(detail)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载批次详情失败')
    }
  }

  async function handleSaveSettings(payload: Partial<Pick<Settings, 'feishuWebhook' | 'proxyUrl' | 'articleCount' | 'requestInterval'>>) {
    try {
      const nextSettings = await saveSettings(payload)
      setSettings(nextSettings)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存设置失败')
    }
  }

  async function handlePushFeishu(batchId: number) {
    try {
      await pushCurrentBatchToFeishu(batchId)
      await refreshTaskData()
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '飞书推送失败')
    }
  }

  async function handleDownloadArticle(articleId: number) {
    try {
      await exportArticleMarkdown(articleId)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '下载 MD 失败')
    }
  }

  async function handleDownloadBatch(batchId: number) {
    try {
      await exportBatchMarkdownZip(batchId)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '下载 ZIP 失败')
    }
  }

  async function handleDownloadArticleDocx(articleId: number) {
    try {
      await exportArticleDocx(articleId)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '下载 DOCX 失败')
    }
  }

  async function handleDeleteBatch(batchId: number) {
    try {
      await deleteBatchAction(batchId)
      await refreshTaskData()
      if (selectedBatch?.id === batchId) {
        const nextLatestBatch = await loadBatchHistory().then((items) => items[0]).catch(() => undefined)
        if (nextLatestBatch) {
          const nextDetail = await loadBatchDetail(nextLatestBatch.id).catch(() => undefined)
          setSelectedBatch(nextDetail)
        } else {
          setSelectedBatch(undefined)
        }
      }
      if (drawerBatch?.id === batchId) {
        setDrawerBatch(undefined)
      }
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除批次失败')
    }
  }

  function handleOpenDashboard() {
    setView('dashboard')
    setIsSidebarOpen(false)
  }

  const NavItem = ({
    viewName,
    label,
    icon: Icon,
  }: {
    viewName: ViewName
    label: string
    icon: typeof LayoutDashboard
  }) => (
    <button
      type="button"
      onClick={() => {
        if (viewName !== 'dashboard') {
          setSelectedBatch(undefined)
        }
        setView(viewName)
        setIsSidebarOpen(false)
      }}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
        view === viewName
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  )

  return (
    <div className="min-h-dvh md:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-4 backdrop-blur-xl md:hidden">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <LayoutDashboard className="h-5 w-5 text-slate-900" />
          <span>NewsFetch</span>
        </h1>
        <button
          type="button"
          aria-label={isSidebarOpen ? '关闭导航' : '打开导航'}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-950/18 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[15rem] flex-col border-r border-white/70 bg-white/90 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-transform duration-300 ease-out md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="border-b border-slate-100/90 px-4 py-4">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <LayoutDashboard className="h-5 w-5 text-slate-900" />
            <span>NewsFetch</span>
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">微信内容抓取与项目批次管理台。</p>
        </div>

        <nav className="mt-2 space-y-1.5 p-3">
          <NavItem viewName="crawl" label="启动向导" icon={Search} />
          <NavItem viewName="accounts" label="公众号管理" icon={Users} />
          <NavItem viewName="dashboard" label="抓取结果看板" icon={ChartBar} />
          <NavItem viewName="settings" label="系统设置" icon={SettingsIcon} />
        </nav>

        <div className="mt-auto hidden px-4 pb-4 md:block">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
            当前界面会根据屏幕宽度自动重排，保持更稳定的留白和信息层次。
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 pb-4 pt-3 sm:px-4 md:px-6 md:py-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1180px]">
          <header className="mb-4 flex flex-col gap-2 sm:mb-5 md:mb-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">NewsFetch</div>
              <h2 className="mt-1.5 text-[clamp(1.25rem,1.2vw+1rem,1.9rem)] font-semibold tracking-tight text-slate-900">
                {viewCopy[view].title}
              </h2>
            </div>
            <p className="max-w-3xl text-sm leading-5 text-slate-500">{viewCopy[view].description}</p>
          </header>

          {error ? (
            <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-red-700 shadow-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="min-w-0 flex-1 text-sm leading-6">{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="rounded-lg p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-white/70 bg-white/84 p-3 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-200 sm:p-4 md:p-5 lg:p-6">
            {view === 'crawl' ? (
            <CrawlPage
              bootstrap={bootstrap}
              accounts={accounts}
              loginState={loginState}
              settings={settings}
              currentTask={currentTask}
              batches={batches}
              onCreate={handleCreate}
              onPrecheck={precheckAccountAction}
              onToggle={handleToggle}
              onLogin={handleRefreshLogin}
              onStartCrawl={handleStartCrawl}
              onSelectBatch={handleSelectBatch}
              onPushFeishu={handlePushFeishu}
              onDownloadBatch={handleDownloadBatch}
              onOpenDashboard={handleOpenDashboard}
              />
            ) : view === 'accounts' ? (
              <AccountsPage
                accounts={accounts}
                onCreate={handleCreate}
                onPrecheck={precheckAccountAction}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ) : view === 'dashboard' ? (
              <DashboardPage
                summary={dashboard}
                batches={batches}
                selectedBatch={selectedBatch}
                drawerBatch={drawerBatch}
                onSelectBatch={handleSelectBatch}
                onOpenBatchDrawer={handleOpenBatchDrawer}
                onCloseDrawer={() => setDrawerBatch(undefined)}
                onDownloadArticle={handleDownloadArticle}
                onDownloadArticleDocx={handleDownloadArticleDocx}
                onDownloadBatch={handleDownloadBatch}
                onDeleteBatch={handleDeleteBatch}
              />
            ) : (
              <SettingsPage settings={settings} bootstrap={bootstrap} onSave={handleSaveSettings} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
