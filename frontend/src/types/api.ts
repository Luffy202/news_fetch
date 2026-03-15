export type Account = {
  id: number
  name: string
  fakeid?: string | null
  isSelected: boolean
}

export type Settings = {
  feishuWebhook?: string | null
  articleCount: number
  requestInterval: number
  loginStatus: 'logged_out' | 'logging_in' | 'logged_in' | 'expired'
  lastLoginAt?: string | null
}

export type Batch = {
  id: number
  batchNo?: string
  status: 'waiting' | 'running' | 'completed' | 'failed'
  totalAccounts: number
  completedAccounts: number
  totalArticles: number
  startedAt: string
  finishedAt?: string | null
  feishuPushStatus?: 'not_pushed' | 'pushed' | 'failed'
  feishuPushedAt?: string | null
}

export type Article = {
  id: number
  title: string
  url: string
  digest?: string | null
  summary?: string | null
  content?: string | null
  publishTime?: string | null
  accountId?: number
}

export type TaskEvent = {
  id: number
  level: 'info' | 'warning' | 'error'
  message: string
  createdAt: string
}

export type BatchDetail = Batch & {
  selectedAccountIds: number[]
  selectedAccounts: Account[]
  errorMessage?: string | null
  articles: Article[]
  events: TaskEvent[]
}

export type TaskStatus = {
  currentBatchId?: number | null
  status: Batch['status'] | 'idle'
  message?: string
  totalAccounts?: number
  completedAccounts?: number
  totalArticles?: number
  startedAt?: string | null
  finishedAt?: string | null
  events: TaskEvent[]
}

export type DistributionItem = {
  label: string
  value: number
}

export type DashboardSummary = {
  totalAccounts: number
  selectedAccounts: number
  totalArticles: number
  totalBatches: number
  successfulBatches: number
  failedBatches: number
  latestCrawlAt?: string | null
  batchStatusDistribution: DistributionItem[]
  accountArticleDistribution: DistributionItem[]
}
