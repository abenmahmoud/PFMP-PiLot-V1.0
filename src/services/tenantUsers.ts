import { getSupabase } from '@/lib/supabase'
import type { ProfileRow } from '@/lib/database.types'

export async function fetchTenantUsers(scopeEstablishmentId?: string | null): Promise<ProfileRow[]> {
  const sb = getSupabase()
  let query = sb.from('profiles').select('*').order('last_name')

  if (scopeEstablishmentId) {
    query = query.eq('establishment_id', scopeEstablishmentId)
  }

  const { data, error } = await query
  if (error) throw new Error(`fetchTenantUsers profiles: ${error.message}`)
  return (data ?? []) as ProfileRow[]
}
