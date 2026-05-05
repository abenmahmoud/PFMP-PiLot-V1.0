import { useSyncExternalStore } from 'react'
import { profiles, CURRENT_USER_ID } from '@/data/demo'
import type { Profile } from '@/types'

const STORAGE_KEY = 'pfmp_demo_user'

function getStoredId(): string {
  if (typeof window === 'undefined') return CURRENT_USER_ID
  try {
    return window.localStorage.getItem(STORAGE_KEY) || CURRENT_USER_ID
  } catch {
    return CURRENT_USER_ID
  }
}

function subscribe(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function useCurrentUser(): Profile {
  const id = useSyncExternalStore(subscribe, getStoredId, () => CURRENT_USER_ID)
  return profiles.find((p) => p.id === id) || profiles.find((p) => p.id === CURRENT_USER_ID)!
}
