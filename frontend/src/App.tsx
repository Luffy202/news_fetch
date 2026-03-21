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

export default function App() {
  const [view, setView] = useState<ViewName>('crawl')
  const [accounts, setAccounts] = useState<Account[]>(initialAppState.accounts)
  const [batches, setBatches] = useState<Batch[]>(initialAppState.batches)
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | undefined>(initialAppState.selectedBatch)
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
    const [nextTask, nextBatches, nextAuth, nextSelectedBatch, nextDashboard] = await Promise.all([
      loadCurrentTask(),
      loadBatchHistory(),
      loadAuthStatus(),
      selectedBatchId ? loadBatchDetail(selectedBatchId).catch(() => undefined) : Promise.resolve(undefined),
      loadDashboardSummary(),
    ])
    setCurrentTask(nextTask)
    setBatches(nextBatches)
    setLoginState(nextAuth)
    setDashboard(nextDashboard)
    if (selectedBatchId) {
      setSelectedBatch(nextSelectedBatch)
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
  }, [selectedBatch?.id])

  useEffect(() => {
    if (view !== 'dashboard' || selectedBatch || batches.length === 0) {
      return
    }
    void handleSelectBatch(batches[0].id)
  }, [view, batches, selectedBatch?.id])

  async function handleCreate(name: string) {
    try {
      await createAccountAction(name)
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

  async function handleLogin() {
    try {
      const nextAuth = await triggerLoginAction()
      setLoginState(nextAuth)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败')
    }
  }

  async function handleStartCrawl() {
    try {
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

  async function handleSaveSettings(payload: Partial<Pick<Settings, 'feishuWebhook' | 'articleCount' | 'requestInterval'>>) {
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
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
        view === viewName
          ? 'bg-blue-50 font-medium text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white p-4 md:hidden">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <LayoutDashboard className="h-5 w-5 text-blue-600" />
          <span>NewsFetch</span>
        </h1>
        <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
      ) : null}

      <aside
        className={`fixed top-0 z-40 h-full w-64 flex-shrink-0 border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:sticky md:h-screen ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="hidden border-b border-gray-100 p-6 md:block">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <span>NewsFetch</span>
          </h1>
        </div>

        <nav className="mt-14 space-y-2 p-4 md:mt-0">
          <NavItem viewName="crawl" label="启动向导" icon={Search} />
          <NavItem viewName="accounts" label="公众号管理" icon={Users} />
          <NavItem viewName="dashboard" label="抓取结果看板" icon={ChartBar} />
          <NavItem viewName="settings" label="系统设置" icon={SettingsIcon} />
        </nav>
      </aside>

      <main className="w-full flex-1 overflow-x-hidden p-4 md:w-auto md:p-8">
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 md:text-2xl">
              {view === 'crawl' && '启动向导'}
              {view === 'accounts' && '公众号管理'}
              {view === 'dashboard' && '抓取结果看板'}
              {view === 'settings' && '系统设置'}
            </h2>
          </div>
        </header>

        {error ? (
          <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button type="button" onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="min-h-[600px] rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 md:p-6">
          {view === 'crawl' ? (
            <CrawlPage
              bootstrap={bootstrap}
              accounts={accounts}
              loginState={loginState}
              settings={settings}
              currentTask={currentTask}
              batches={batches}
              onCreate={handleCreate}
              onToggle={handleToggle}
              onLogin={handleLogin}
              onStartCrawl={handleStartCrawl}
              onSelectBatch={handleSelectBatch}
              onPushFeishu={handlePushFeishu}
              onDownloadBatch={handleDownloadBatch}
              onOpenDashboard={handleOpenDashboard}
            />
          ) : view === 'accounts' ? (
            <AccountsPage accounts={accounts} onCreate={handleCreate} onToggle={handleToggle} onDelete={handleDelete} />
          ) : view === 'dashboard' ? (
            <DashboardPage
              summary={dashboard}
              batches={batches}
              selectedBatch={selectedBatch}
              onSelectBatch={handleSelectBatch}
              onDownloadArticle={handleDownloadArticle}
              onDownloadArticleDocx={handleDownloadArticleDocx}
              onDownloadBatch={handleDownloadBatch}
            />
          ) : (
            <SettingsPage settings={settings} bootstrap={bootstrap} onSave={handleSaveSettings} />
          )}
        </div>
      </main>
    </div>
  )
}
