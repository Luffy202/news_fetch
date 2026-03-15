import { useState, useEffect } from 'react'
import AccountList from '../components/AccountList'
import ArticleDetailDrawer from '../components/ArticleDetailDrawer'
import BatchHistoryTable from '../components/BatchHistoryTable'
import FeishuPushPanel from '../components/FeishuPushPanel'
import LoginStatusCard from '../components/LoginStatusCard'
import TaskEventList from '../components/TaskEventList'
import TaskStatusPanel from '../components/TaskStatusPanel'
import type { Account, Batch, BatchDetail, Settings, TaskStatus } from '../types/api'

type CrawlPageProps = {
  accounts: Account[]
  loginStatus: Settings['loginStatus']
  lastLoginAt?: string | null
  currentTask: TaskStatus
  batches: Batch[]
  selectedBatch?: BatchDetail
  onToggle: (account: Account) => Promise<void> | void
  onLogin: () => Promise<void> | void
  onStartCrawl: () => Promise<void> | void
  onSelectBatch: (batchId: number) => Promise<void> | void
  onPushFeishu: (batchId: number) => Promise<void> | void
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
}

export default function CrawlPage({
  accounts,
  loginStatus,
  lastLoginAt,
  currentTask,
  batches,
  selectedBatch,
  onToggle,
  onLogin,
  onStartCrawl,
  onSelectBatch,
  onPushFeishu,
  onDownloadArticle,
  onDownloadBatch,
}: CrawlPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (selectedBatch) {
      setIsDrawerOpen(true)
    }
  }, [selectedBatch])

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LoginStatusCard 
          loginStatus={loginStatus} 
          lastLoginAt={lastLoginAt} 
          onLogin={onLogin} 
        />
        <TaskStatusPanel 
          task={currentTask} 
          onStart={onStartCrawl} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">本轮勾选公众号</h3>
            {accounts.length === 0 ? (
               <div className="text-gray-500 text-center py-8 text-sm">
                 还没有公众号，请先到公众号管理页添加。
               </div>
            ) : (
               <AccountList accounts={accounts} onToggle={onToggle} />
            )}
          </div>
          
          <div className="flex-1 min-h-[400px]">
             <BatchHistoryTable 
               batches={batches} 
               selectedBatchId={selectedBatch?.id} 
               onSelect={onSelectBatch} 
               onDownloadBatch={onDownloadBatch}
             />
          </div>
        </div>

        <div className="space-y-6">
           <TaskEventList events={currentTask.events} />
           
           {selectedBatch && (
             <FeishuPushPanel batch={selectedBatch} onPush={onPushFeishu} />
           )}
        </div>
      </div>
      
      {isDrawerOpen && selectedBatch && (
        <ArticleDetailDrawer
          batch={selectedBatch}
          onDownloadArticle={onDownloadArticle}
          onDownloadBatch={onDownloadBatch}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  )
}
