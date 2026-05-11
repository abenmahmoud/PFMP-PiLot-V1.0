import { getSupabase } from '@/lib/supabase'
import { logAuditAsync } from '@/lib/audit'
import { getActiveEstablishmentScope } from '@/lib/auth'
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
  name?: string
  city?: string | null
  uai?: string | null
  school_year: string | null
  teacher_load_threshold: number
  ai_enabled: boolean
  rgpd_notice: string | null
  logo_url: string | null
}

export interface UpdateSettingsResult {
  establishment: EstablishmentRow
  settings: EstablishmentSettingsRow
}

export async function fetchTenantSettings(profile: ProfileRow): Promise<TenantSettings> {
  const sb = getSupabase()
  const activeScope = await getActiveEstablishmentScope()
  const establishmentId = profile.establishment_id ?? activeScope

  if (!establishmentId && profile.role !== 'superadmin') {
    return { establishment: null, settings: null }
  }

  const establishmentQuery = establishmentId
    ? sb.from('establishments').select('*').eq('id', establishmentId).maybeSingle()
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
): Promise<UpdateSettingsResult> {
  const sb = getSupabase()
  const shouldUpdateIdentity =
    input.name !== undefined || input.city !== undefined || input.uai !== undefined

  const establishmentPatch: Partial<Pick<EstablishmentRow, 'name' | 'city' | 'uai'>> = {}
  if (input.name !== undefined) establishmentPatch.name = input.name
  if (input.city !== undefined) establishmentPatch.city = input.city
  if (input.uai !== undefined) establishmentPatch.uai = input.uai

  const establishmentOperation = shouldUpdateIdentity
    ? sb
      .from('establishments')
      .update(establishmentPatch)
      .eq('id', establishmentId)
      .select('*')
      .single()
    : sb.from('establishments').select('*').eq('id', establishmentId).single()

  const settingsOperation = sb
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

  const [establishmentSettled, settingsSettled] = await Promise.allSettled([
    establishmentOperation,
    settingsOperation,
  ])

  const establishmentResult = unwrapSupabaseSettled<EstablishmentRow>(
    establishmentSettled,
    'identite etablissement',
  )
  const settingsResult = unwrapSupabaseSettled<EstablishmentSettingsRow>(
    settingsSettled,
    'parametres etablissement',
  )

  logAuditAsync({
    action: 'superadmin_action',
    description: 'Parametres etablissement mis a jour',
    establishmentId,
    metadata: { scope: 'establishment_settings', identityUpdated: shouldUpdateIdentity },
  })

  return {
    establishment: establishmentResult,
    settings: settingsResult,
  }
}

interface SupabaseSettledValue<T> {
  data: T | null
  error: { message: string } | null
}

function unwrapSupabaseSettled<T>(
  settled: PromiseSettledResult<unknown>,
  label: string,
): T {
  if (settled.status === 'rejected') {
    throw new Error(`Echec ${label}: ${String(settled.reason)}`)
  }

  const result = settled.value as SupabaseSettledValue<T>
  if (result.error) {
    throw new Error(`Echec ${label}: ${result.error.message}`)
  }
  if (!result.data) {
    throw new Error(`Echec ${label}: aucune donnee retournee`)
  }

  return result.data
}
