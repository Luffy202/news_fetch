import { request } from './http'
import type { BootstrapStatus } from '../types/api'

export function getBootstrapStatus() {
  return request<BootstrapStatus>('/api/app/bootstrap-status')
}
