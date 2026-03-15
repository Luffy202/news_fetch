import { request } from './http'
import type { Batch, BatchDetail } from '../types/api'

export function listBatches() {
  return request<Batch[]>('/api/batches')
}

export function getBatchDetail(batchId: number) {
  return request<BatchDetail>(`/api/batches/${batchId}`)
}
