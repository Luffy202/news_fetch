import { request } from './http'

export type FeishuPushResult = {
  batchId: number
  feishuPushStatus: 'not_pushed' | 'pushed' | 'failed'
  feishuPushedAt?: string | null
  message: string
}

export function pushBatchToFeishu(batchId: number) {
  return request<FeishuPushResult>(`/api/batches/${batchId}/feishu-push`, {
    method: 'POST',
  })
}
