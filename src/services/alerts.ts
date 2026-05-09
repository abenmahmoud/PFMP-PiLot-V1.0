import { getSupabase } from '@/lib/supabase'
import type { AlertLevel, AlertRow } from '@/lib/database.types'

export interface AlertFilters {
  severity?: AlertLevel
  resolved?: boolean
}

export async function fetchAlerts(filters: AlertFilters = {}): Promise<AlertRow[]> {
  const sb = getSupabase()
  let query = sb
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.resolved !== undefined) query = query.eq('resolved', filters.resolved)

  const { data, error } = await query
  if (error) throw new Error(`fetchAlerts: ${error.message}`)
  return (data as AlertRow[]) ?? []
}

export async function resolveAlert(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('alerts').update({ resolved: true }).eq('id', id)
  if (error) throw new Error(`resolveAlert: ${error.message}`)
}
