import { useSyncExternalStore } from 'react'
import { profiles, CURRENT_USER_ID } from '@/data/demo'
import type { Profile } from '@/types'
import type { ProfileRow } from './database.types'
import { useAuth } from './AuthProvider'
import { isDemoMode } from './supabase'

const STORAGE_KEY = 'pfmp_demo_user'
const SUPABASE_PENDING_PROFILE: Profile = {
  id: 'supabase-pending-profile',
  establishmentId: null,
  firstName: 'Utilisateur',
  lastName: 'connecte',
  email: '',
  role: 'eleve',
  avatarColor: '#475569',
}

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
  const auth = useAuth()
  const demoId = useSyncExternalStore(subscribe, getStoredId, () => CURRENT_USER_ID)

  if (isDemoMode()) {
    return (
      profiles.find((p) => p.id === demoId) ||
      profiles.find((p) => p.id === CURRENT_USER_ID)!
    )
  }

  if (!auth.profile) return SUPABASE_PENDING_PROFILE

  return profileRowToProfile(auth.profile)
}

export function useCurrentProfile(): Profile | null {
  const auth = useAuth()
  const demoId = useSyncExternalStore(subscribe, getStoredId, () => CURRENT_USER_ID)
  if (isDemoMode()) {
    return (
      profiles.find((p) => p.id === demoId) ||
      profiles.find((p) => p.id === CURRENT_USER_ID)!
    )
  }
  return auth.profile ? profileRowToProfile(auth.profile) : null
}

function profileRowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    avatarColor: row.avatar_color ?? undefined,
  }
}
