import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase, instancié paresseusement à la première utilisation.
 *
 * Pourquoi lazy ? En mode démo (VITE_DEMO_MODE=true) ou en SSR avant que les
 * variables d'env soient résolues, on ne veut pas crasher en absence de
 * VITE_SUPABASE_URL. La fonction `getSupabase()` lève une erreur claire si
 * on essaie de l'utiliser sans configuration.
 *
 * Pour le mode démo, on utilise plutôt `isSupabaseConfigured()` en amont pour
 * router vers les données de `data/demo.ts`.
 *
 * NOTE TYPAGE : le client est volontairement non paramétré (pas de
 * `<Database>`) en attendant la génération automatique des types via la
 * CLI Supabase. Voir le commentaire dans `database.types.ts`. Les services
 * (à venir dans src/services/) feront le typage explicite des retours via
 * les Row types nommés.
 */

let _client: SupabaseClient | null = null

export function getSupabaseUrl(): string | undefined {
  return import.meta.env.VITE_SUPABASE_URL
}

export function getSupabaseAnonKey(): string | undefined {
  return import.meta.env.VITE_SUPABASE_ANON_KEY
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export function isDemoMode(): boolean {
  // En l'absence de Supabase configuré, on est forcément en mode démo.
  // Si Supabase est configuré, le mode démo s'active uniquement si la
  // variable est explicitement à 'true'.
  if (!isSupabaseConfigured()) return true
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error(
      'Supabase non configuré. Définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ' +
        'dans .env.local (ou activer VITE_DEMO_MODE=true pour utiliser les données de démo).',
    )
  }
  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return _client
}

/**
 * Helper de test : vide le client cache. À utiliser uniquement en tests
 * ou pour reconfigurer le client après un changement d'env.
 */
export function _resetSupabaseClient(): void {
  _client = null
}
