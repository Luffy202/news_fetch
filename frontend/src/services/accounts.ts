import { request } from './http'
import type { Account, AccountPrecheckResult, CreateAccountInput } from '../types/api'

export type UpdateAccountPayload = {
  name?: string
  isSelected?: boolean
}

export function listAccounts() {
  return request<Account[]>('/api/accounts')
}

export function createAccount(payload: CreateAccountInput) {
  return request<Account>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function precheckAccount(name: string) {
  return request<AccountPrecheckResult>('/api/accounts/precheck', {
    method: 'POST',
    body: JSON.stringify({ name }),
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
