import { request } from './http'
import type { AuthStatus, TaskStatus } from '../types/api'

export function getAuthStatus() {
  return request<AuthStatus>('/api/auth/status')
}

export function triggerLogin(force = false) {
  return request<AuthStatus>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ force }),
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
