import { buildApiUrl } from './http'

function parseFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback
  }
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? fallback
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadArticleMarkdown(articleId: number) {
  const response = await fetch(buildApiUrl(`/api/articles/${articleId}/markdown`))
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string }
    throw new Error(payload.detail ?? '下载 Markdown 失败')
  }
  const blob = await response.blob()
  const filename = parseFilename(response.headers.get('Content-Disposition'), `article-${articleId}.md`)
  triggerDownload(blob, filename)
}

export async function downloadBatchZip(batchId: number) {
  const response = await fetch(buildApiUrl(`/api/batches/${batchId}/markdown-export`))
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string }
    throw new Error(payload.detail ?? '下载 ZIP 失败')
  }
  const blob = await response.blob()
  const filename = parseFilename(response.headers.get('Content-Disposition'), `batch-${batchId}.zip`)
  triggerDownload(blob, filename)
}

export async function downloadArticleDocx(articleId: number) {
  const response = await fetch(buildApiUrl(`/api/articles/${articleId}/docx`))
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string }
    throw new Error(payload.detail ?? '下载 DOCX 失败')
  }
  const blob = await response.blob()
  const filename = parseFilename(response.headers.get('Content-Disposition'), `article-${articleId}.docx`)
  triggerDownload(blob, filename)
}
