import { request } from './http'
import type { Account } from '../types/api'

export type CreateAccountPayload = {
  name: string
  isSelected?: boolean
}

export type UpdateAccountPayload = {
  name?: string
  isSelected?: boolean
}

export function listAccounts() {
  return request<Account[]>('/api/accounts')
}

export function createAccount(payload: CreateAccountPayload) {
  return request<Account>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAccount(accountId: number, payload: UpdateAccountPayload) {
  return request<Account>(`/api/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAccount(accountId: number) {
  return request<void>(`/api/accounts/${accountId}`, {
    method: 'DELETE',
  })
}
