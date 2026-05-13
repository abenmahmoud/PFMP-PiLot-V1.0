import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(uuid)) {
    throw new Error(`${label} invalide.`)
  }
  return uuid
}
