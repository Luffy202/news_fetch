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
    const [nextTask, nextBatches, nextAuth, nextSelectedBatch] = await Promise.all([
      loadCurrentTask(),
      loadBatchHistory(),
      loadAuthStatus(),
      selectedBatchId ? loadBatchDetail(selectedBatchId).catch(() => undefined) : Promise.resolve(undefined),
    ])
    setCurrentTask(nextTask)
    setBatches(nextBatches)
    setLoginState(nextAuth)
    if (selectedBatchId) {
      setSelectedBatch(nextSelectedBatch)
    }
  }

  async function refreshSettings() {
    const nextSettings = await loadSettings()
    setSettings(nextSettings)
  }

  async function refreshDashboard() {
    const nextDashboard = await loadDashboardSummary()
    setDashboard(nextDashboard)
  }

  async function refreshBootstrap() {
    const nextBootstrap = await loadBootstrapStatus()
    setBootstrap(nextBootstrap)
  }

  async function refreshAll() {
    try {
      await Promise.all([refreshAccounts(), refreshTaskData(), refreshSettings(), refreshDashboard(), refreshBootstrap()])
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
      setError(requestError instanceof Error ? requestError.message : '启动爬取失败')
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

  function handleCloseBatchDetail() {
    setSelectedBatch(undefined)
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
      const detail = await loadBatchDetail(batchId)
      setSelectedBatch(detail)
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
      setError(requestError instanceof Error ? requestError.message : '下载 Markdown 失败')
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
      onClick={() => {
        if (viewName !== 'crawl') {
          handleCloseBatchDetail()
        }
        setView(viewName)
        setIsSidebarOpen(false)
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        view === viewName
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          <span>NewsFetch</span>
        </h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 h-full md:h-screen w-64 bg-white border-r border-gray-200 flex-shrink-0 z-40 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-gray-100 hidden md:block">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <span>NewsFetch</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">双击启动后，从这里完成登录、抓取和结果查看。</p>
        </div>
        <nav className="p-4 space-y-2 mt-14 md:mt-0">
          <NavItem viewName="crawl" label="启动向导" icon={Search} />
          <NavItem viewName="accounts" label="公众号管理" icon={Users} />
          <NavItem viewName="dashboard" label="源数据看板" icon={ChartBar} />
          <NavItem viewName="settings" label="系统设置" icon={SettingsIcon} />
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 w-full md:w-auto overflow-x-hidden">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              {view === 'crawl' && '启动向导'}
              {view === 'accounts' && '公众号管理'}
              {view === 'dashboard' && '源数据看板'}
              {view === 'settings' && '系统设置'}
            </h2>
            <p className="text-gray-500 mt-1 text-xs md:text-sm">
              {view === 'crawl' && '把环境检查、微信登录、公众号选择、抓取和结果查看串成一条顺滑流程。'}
              {view === 'accounts' && '配置需要监控的微信公众号。'}
              {view === 'dashboard' && '查看历史数据统计与趋势。'}
              {view === 'settings' && '调整系统全局参数和通知设置。'}
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] p-4 md:p-6 transition-all duration-200">
          {view === 'crawl' ? (
            <CrawlPage
              bootstrap={bootstrap}
              accounts={accounts}
              loginState={loginState}
              settings={settings}
              currentTask={currentTask}
              batches={batches}
              selectedBatch={selectedBatch}
              onCreate={handleCreate}
              onToggle={handleToggle}
              onLogin={handleLogin}
              onStartCrawl={handleStartCrawl}
              onSelectBatch={handleSelectBatch}
              onCloseBatchDetail={handleCloseBatchDetail}
              onPushFeishu={handlePushFeishu}
              onDownloadArticle={handleDownloadArticle}
              onDownloadArticleDocx={handleDownloadArticleDocx}
              onDownloadBatch={handleDownloadBatch}
            />
          ) : view === 'accounts' ? (
            <AccountsPage accounts={accounts} onCreate={handleCreate} onToggle={handleToggle} onDelete={handleDelete} />
          ) : view === 'dashboard' ? (
            <DashboardPage summary={dashboard} />
          ) : (
            <SettingsPage settings={settings} bootstrap={bootstrap} onSave={handleSaveSettings} />
          )}
        </div>
      </main>
    </div>
  )
}
