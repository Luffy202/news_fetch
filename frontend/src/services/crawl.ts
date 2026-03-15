import { request } from './http'
import type { Settings, TaskStatus } from '../types/api'

export function getAuthStatus() {
  return request<Pick<Settings, 'loginStatus' | 'lastLoginAt'>>('/api/auth/status')
}

export function triggerLogin() {
  return request<Pick<Settings, 'loginStatus' | 'lastLoginAt'>>('/api/auth/login', {
    method: 'POST',
  })
}

export function startCrawl() {
  return request<TaskStatus>('/api/crawl', {
    method: 'POST',
  })
}

export function getCurrentTask() {
  return request<TaskStatus>('/api/crawl/current')
}
