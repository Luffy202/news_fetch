import { X, Download, ExternalLink, FileText, Calendar } from 'lucide-react'
import type { BatchDetail } from '../types/api'

const statusTextMap = {
  waiting: '等待中',
  running: '抓取中',
  completed: '已完成',
  failed: '失败',
}

type ArticleDetailDrawerProps = {
  batch?: BatchDetail
  onDownloadArticle: (articleId: number) => Promise<void> | void
  onDownloadArticleDocx: (articleId: number) => Promise<void> | void
  onDownloadBatch: (batchId: number) => Promise<void> | void
  onClose?: () => void
}

export default function ArticleDetailDrawer({
  batch,
  onDownloadArticle,
  onDownloadArticleDocx,
  onDownloadBatch,
  onClose,
}: ArticleDetailDrawerProps) {
  if (!batch) return null

  const getAccountName = (accountId: number) => {
    // batch.selectedAccounts 可能是 undefined，如果 API 没有返回
    if (!batch.selectedAccounts) return `Account ID: ${accountId}`
    return batch.selectedAccounts.find(a => a.id === accountId)?.name ?? `ID: ${accountId}`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[600px] max-w-full bg-white shadow-2xl border-l border-gray-200 transform transition-transform overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
         <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-800">批次详情 #{batch.batchNo ?? batch.id}</h2>
              <div className="flex gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                   batch.status === 'completed'
                     ? 'bg-green-100 text-green-700'
                     : batch.status === 'running'
                       ? 'bg-blue-100 text-blue-700'
                       : batch.status === 'failed'
                         ? 'bg-red-100 text-red-700'
                         : 'bg-gray-100 text-gray-700'
                 }`}>
                   {statusTextMap[batch.status]}
                 </span>
                 <span className="text-gray-500 text-xs flex items-center">{batch.startedAt}</span>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => onDownloadBatch(batch.id)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="下载批量数据">
                  <Download className="w-5 h-5" />
               </button>
               {onClose && (
                 <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="关闭">
                    <X className="w-5 h-5" />
                 </button>
               )}
            </div>
         </div>
         
         <div className="p-6 space-y-6">
            {batch.errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100">
                 {batch.errorMessage}
              </div>
            )}
            
            <div>
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">文章列表 ({batch.articles.length})</h3>
               {batch.articles.length === 0 ? (
                 <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                   暂无文章数据
                 </div>
               ) : (
                 <div className="space-y-4">
                   {batch.articles.map(article => (
                     <div key={article.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors bg-white shadow-sm hover:shadow-md">
                        <h4 className="font-semibold text-gray-900 mb-2 leading-tight">{article.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                           <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {article.publishTime ?? '未知时间'}</span>
                           <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {getAccountName(article.accountId ?? 0)}</span>
                        </div>
                        
                        {(article.digest || article.summary) && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-3 leading-relaxed">{article.summary ?? article.digest}</p>
                        )}
                        
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                           <a href={article.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 font-medium">
                             查看原文 <ExternalLink className="w-3 h-3" />
                           </a>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => onDownloadArticle(article.id)}
                              className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3" /> 下载 Markdown
                            </button>
                            <button
                              onClick={() => onDownloadArticleDocx(article.id)}
                              className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3" /> 下载 DOCX
                            </button>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </>
  )
}
