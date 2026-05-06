/**
 * Helper d'audit log — trace les actions importantes dans `audit_logs`.
 *
 * IMPORTANT — ÉCRITURE DEPUIS LE CLIENT :
 *
 *   Aujourd'hui, ce helper insère directement dans `audit_logs` via le client
 *   anon. Cela fonctionne, mais a une faiblesse : un utilisateur malveillant
 *   peut falsifier sa propre trace (rejouer une action sans la logger, ou
 *   logger une action qu'il n'a pas faite). Pour une vraie traçabilité, le
 *   bon endroit est une Edge Function en service_role.
 *
 *   Pour l'instant, on accepte cette faiblesse parce que :
 *   - le frontend est la seule surface ;
 *   - on veut au moins préparer la structure pour pas la rajouter plus tard ;
 *   - les actions critiques (validation visite, génération document) seront
 *     migrées vers Edge Functions plus tard.
 *
 *   Quand l'Edge Function existera, ce helper appellera /api/audit au lieu
 *   d'insérer directement, sans changement d'API côté caller.
 */

import { getSupabase, isSupabaseConfigured, isDemoMode } from './supabase'
import type { Json } from './database.types'

export type AuditAction =
  | 'login'
  | 'logout'
  | 'import'
  | 'student_create'
  | 'student_update'
  | 'student_archive'
  | 'company_create'
  | 'company_update'
  | 'assignment_update'
  | 'visit_create'
  | 'visit_update'
  | 'visit_validate'
  | 'document_create'
  | 'document_generate'
  | 'document_validate'
  | 'signature_send'
  | 'signature_receive'
  | 'tutor_token_create'
  | 'export'
  | 'role_change'
  | 'ai_generate'
  | 'superadmin_action'

export interface AuditEntry {
  action: AuditAction
  description?: string
  metadata?: Record<string, unknown>
  /** Override automatique : par défaut on prend l'établissement du user courant */
  establishmentId?: string | null
  /** Override automatique : par défaut on prend l'utilisateur courant */
  userId?: string | null
}

/**
 * Trace une action dans audit_logs.
 *
 * Mode démo : no-op silencieux (log console seulement).
 * Mode réel : insert dans Supabase.
 *
 * Cette fonction ne lance JAMAIS d'exception : elle ne doit pas casser
 * le flux applicatif. Toute erreur est logguée en console.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (isDemoMode()) {
    console.info('[audit][demo]', entry.action, entry.description ?? '')
    return
  }
  if (!isSupabaseConfigured()) return

  try {
    const supabase = getSupabase()
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = entry.userId ?? sessionData.session?.user.id ?? null

    // Pour establishment_id : si pas fourni, on lit le profil de l'utilisateur courant
    let establishmentId = entry.establishmentId
    if (establishmentId === undefined && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('establishment_id')
        .eq('id', userId)
        .maybeSingle<{ establishment_id: string | null }>()
      establishmentId = profile?.establishment_id ?? null
    }

    const { error } = await supabase.from('audit_logs').insert({
      action: entry.action,
      description: entry.description ?? null,
      metadata: (entry.metadata ?? null) as Json,
      user_id: userId,
      establishment_id: establishmentId ?? null,
      // ip_address et user_agent ne sont pas accessibles côté client de manière
      // fiable ; ils seront ajoutés par l'Edge Function quand on migrera.
    })

    if (error) {
      console.error('[audit] insert failed:', error.message, entry)
    }
  } catch (e) {
    console.error('[audit] unexpected error:', e)
  }
}

/**
 * Variante synchrone fire-and-forget. À utiliser quand on ne veut pas
 * bloquer le rendu. Toute erreur est silencieuse.
 */
export function logAuditAsync(entry: AuditEntry): void {
  void logAudit(entry)
}
