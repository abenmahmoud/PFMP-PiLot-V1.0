import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/database.types'

declare const process: {
  env: Record<string, string | undefined>
}

export type AdminClient = SupabaseClient

export function createAdminClient(): AdminClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL manquant cote serveur.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant cote serveur Vercel.')

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function safeHandlerCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn()
    return toPlainJson(result)
  } catch (err) {
    const message =
      err instanceof Error && typeof err.message === 'string' && err.message.length > 0
        ? err.message
        : 'Erreur serveur inattendue.'
    console.error('[server-fn]', message, err)
    throw new Error(message)
  }
}

export function toPlainJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value))) as T
}

export function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateUuid(value: unknown, label: string): string {
  const uuid = clean(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new Error(`${label} invalide.`)
  }
  return uuid
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function isActiveScopeValid(expiresAt: unknown): boolean {
  if (typeof expiresAt !== 'string' || expiresAt.length === 0) return true
  const expiry = new Date(expiresAt)
  return Number.isNaN(expiry.getTime()) || expiry.getTime() >= Date.now()
}

async function activeEstablishmentExists(adminClient: AdminClient, establishmentId: string): Promise<boolean> {
  const { data, error } = await adminClient
    .from('establishments')
    .select('id,active')
    .eq('id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Verification etablissement actif impossible: ${error.message}`)
  return Boolean(data && (data as { active?: boolean }).active !== false)
}

export async function getCallerProfile(
  adminClient: AdminClient,
  accessToken: string,
): Promise<ProfileRow> {
  const { data: userResult, error: userError } = await adminClient.auth.getUser(accessToken)
  const caller = userResult.user
  if (userError || !caller) throw new Error('Session invalide. Reconnectez-vous.')

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .maybeSingle()

  if (error) throw new Error(`Lecture profil appelant impossible: ${error.message}`)
  if (!profile) throw new Error('Profil appelant introuvable.')
  const profileRow = profile as unknown as ProfileRow

  // Hotfix: pour les superadmin qui ont selectionne un etablissement actif via
  // le tenant switcher (stocke dans user_metadata.active_establishment_id),
  // injecter cet etablissement dans le caller.establishment_id afin que
  // toutes les helpers existantes (resolveReadableEstablishment,
  // resolveEstablishmentId, etc.) fonctionnent sans modification.
  if (profileRow.role === 'superadmin' && !profileRow.establishment_id) {
    const metadata = caller.user_metadata as { active_establishment_id?: unknown; active_establishment_expires_at?: unknown } | null
    const activeId = metadata?.active_establishment_id
    const expiresAt = metadata?.active_establishment_expires_at
    if (isUuid(activeId) && isActiveScopeValid(expiresAt) && (await activeEstablishmentExists(adminClient, activeId))) {
      profileRow.establishment_id = activeId
    }
  }

  return profileRow
}

export async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    establishmentId: string | null
    userId: string | null
    action: string
    description: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: input.userId,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? {},
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}
