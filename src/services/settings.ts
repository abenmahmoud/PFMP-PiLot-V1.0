import { getSupabase } from '@/lib/supabase'
import { logAuditAsync } from '@/lib/audit'
import type {
  EstablishmentRow,
  EstablishmentSettingsRow,
  ProfileRow,
} from '@/lib/database.types'

export interface TenantSettings {
  establishment: EstablishmentRow | null
  settings: EstablishmentSettingsRow | null
}

export interface UpdateSettingsInput {
  school_year: string | null
  teacher_load_threshold: number
  ai_enabled: boolean
  rgpd_notice: string | null
  logo_url: string | null
}

export async function fetchTenantSettings(profile: ProfileRow): Promise<TenantSettings> {
  const sb = getSupabase()
  if (!profile.establishment_id && profile.role !== 'superadmin') {
    return { establishment: null, settings: null }
  }

  const establishmentQuery = profile.establishment_id
    ? sb.from('establishments').select('*').eq('id', profile.establishment_id).maybeSingle()
    : sb.from('establishments').select('*').order('created_at').limit(1).maybeSingle()

  const { data: establishmentData, error: establishmentError } = await establishmentQuery
  if (establishmentError) {
    throw new Error(`fetchTenantSettings establishment: ${establishmentError.message}`)
  }

  const establishment = (establishmentData as EstablishmentRow | null) ?? null
  if (!establishment) return { establishment: null, settings: null }

  const { data: settingsData, error: settingsError } = await sb
    .from('establishment_settings')
    .select('*')
    .eq('establishment_id', establishment.id)
    .maybeSingle()

  if (settingsError) throw new Error(`fetchTenantSettings settings: ${settingsError.message}`)

  return {
    establishment,
    settings: (settingsData as EstablishmentSettingsRow | null) ?? null,
  }
}

export async function updateTenantSettings(
  establishmentId: string,
  input: UpdateSettingsInput,
): Promise<EstablishmentSettingsRow> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('establishment_settings')
    .upsert({
      establishment_id: establishmentId,
      school_year: input.school_year,
      teacher_load_threshold: input.teacher_load_threshold,
      ai_enabled: input.ai_enabled,
      rgpd_notice: input.rgpd_notice,
      logo_url: input.logo_url,
    })
    .select('*')
    .single()

  if (error) throw new Error(`updateTenantSettings: ${error.message}`)

  logAuditAsync({
    action: 'superadmin_action',
    description: 'Parametres etablissement mis a jour',
    establishmentId,
    metadata: { scope: 'establishment_settings' },
  })

  return data as EstablishmentSettingsRow
}
