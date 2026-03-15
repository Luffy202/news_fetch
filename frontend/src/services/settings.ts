import { request } from './http'
import type { Settings } from '../types/api'

export function getSettings() {
  return request<Settings>('/api/settings')
}

export function updateSettings(payload: Partial<Pick<Settings, 'feishuWebhook' | 'articleCount' | 'requestInterval'>>) {
  return request<Settings>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
