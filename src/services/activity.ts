import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type { AuditLogRow, ProfileRow } from '@/lib/database.types'

export interface ActivityItem {
  log: AuditLogRow
  user: ProfileRow | null
}

export async function fetchActivity(limit = 100): Promise<ActivityItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (scope) query = query.eq('establishment_id', scope)

  const { data, error } = await query

  if (error) throw new Error(`fetchActivity audit_logs: ${error.message}`)

  const logs = (data as AuditLogRow[]) ?? []
  const userIds = unique(logs.map((log) => log.user_id))
  const usersResult =
    userIds.length > 0
      ? await sb.from('profiles').select('*').in('id', userIds)
      : { data: [], error: null }

  if (usersResult.error) throw new Error(`fetchActivity profiles: ${usersResult.error.message}`)

  const userById = indexById((usersResult.data as ProfileRow[]) ?? [])
  return logs.map((log) => ({
    log,
    user: log.user_id ? userById.get(log.user_id) ?? null : null,
  }))
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
