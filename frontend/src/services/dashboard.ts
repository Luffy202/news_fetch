import { request } from './http'
import type { DashboardSummary } from '../types/api'

export function getDashboardSummary() {
  return request<DashboardSummary>('/api/dashboard/summary')
}
