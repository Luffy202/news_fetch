import { createAccount, deleteAccount, listAccounts, precheckAccount, updateAccount } from '../services/accounts'
import { getBootstrapStatus } from '../services/app'
import { deleteBatch, getBatchDetail, listBatches } from '../services/batches'
import { getAuthStatus, getCurrentTask, startCrawl, triggerLogin } from '../services/crawl'
import { pushBatchToFeishu } from '../services/feishu'
import { getDashboardSummary } from '../services/dashboard'
import { downloadArticleDocx, downloadArticleMarkdown, downloadBatchZip } from '../services/exports'
import { getSettings, updateSettings } from '../services/settings'
import type {
  Account,
  AuthStatus,
  Batch,
  BatchDetail,
  BootstrapStatus,
  CreateAccountInput,
  DashboardSummary,
  Settings,
  TaskStatus,
} from '../types/api'

export type AppState = {
  accounts: Account[]
  settings?: Settings
  dashboard?: DashboardSummary
  currentTask: TaskStatus
  selectedBatch?: BatchDetail
  batches: Batch[]
}

export const initialAppState: AppState = {
  accounts: [],
  currentTask: {
    status: 'idle',
    events: [],
  },
  batches: [],
}

export async function loadAccounts(): Promise<Account[]> {
  return listAccounts()
}

export async function createAccountAction(payload: CreateAccountInput): Promise<Account> {
  return createAccount(payload)
}

export async function precheckAccountAction(name: string) {
  return precheckAccount(name)
}

export async function toggleAccountSelection(account: Account): Promise<Account> {
  return updateAccount(account.id, { isSelected: !account.isSelected })
}

export async function deleteAccountAction(account: Account): Promise<void> {
  await deleteAccount(account.id)
}

export async function loadAuthStatus(): Promise<AuthStatus> {
  return getAuthStatus()
}

export async function triggerLoginAction(force = false): Promise<AuthStatus> {
  return triggerLogin(force)
}

export async function startCrawlAction(): Promise<TaskStatus> {
  return startCrawl()
}

export async function loadCurrentTask(): Promise<TaskStatus> {
  return getCurrentTask()
}

export async function loadBatchHistory(): Promise<Batch[]> {
  return listBatches()
}

export async function loadBatchDetail(batchId: number): Promise<BatchDetail> {
  return getBatchDetail(batchId)
}

export async function deleteBatchAction(batchId: number): Promise<void> {
  await deleteBatch(batchId)
}

export async function loadSettings(): Promise<Settings> {
  return getSettings()
}

export async function saveSettings(payload: Partial<Pick<Settings, 'feishuWebhook' | 'proxyUrl' | 'articleCount' | 'requestInterval'>>): Promise<Settings> {
  return updateSettings(payload)
}

export async function pushCurrentBatchToFeishu(batchId: number) {
  return pushBatchToFeishu(batchId)
}

export async function loadDashboardSummary(): Promise<DashboardSummary> {
  return getDashboardSummary()
}

export async function loadBootstrapStatus(): Promise<BootstrapStatus> {
  return getBootstrapStatus()
}

export async function exportArticleMarkdown(articleId: number): Promise<void> {
  await downloadArticleMarkdown(articleId)
}

export async function exportBatchMarkdownZip(batchId: number): Promise<void> {
  await downloadBatchZip(batchId)
}

export async function exportArticleDocx(articleId: number): Promise<void> {
  await downloadArticleDocx(articleId)
}
