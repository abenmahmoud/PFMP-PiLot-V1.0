/**
 * Couche d'authentification Supabase pour PFMP Pilot AI.
 *
 * Ce module est volontairement isolé : aucune page ne doit importer
 * `@supabase/supabase-js` directement, tout passe par ici.
 *
 * IMPORTANT — STATUT ACTUEL :
 *
 *   Ce fichier expose la signature finale de l'API auth, mais
 *   AUCUNE PAGE NE L'UTILISE ENCORE.
 *
 *   Le frontend continue d'utiliser `useCurrentUser()` (lib/useCurrentUser.ts)
 *   qui lit localStorage en mode démo. Le branchement de cette API auth
 *   réelle se fera dans un commit dédié (Lot 4 du plan d'implémentation),
 *   après validation que Supabase est bien provisionné en prod.
 */

import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured, isDemoMode } from './supabase'
import type { ProfileRow, UserRole } from './database.types'

export type Profile = ProfileRow

export interface AuthState {
  /** En cours de chargement (résolution session initiale) */
  loading: boolean
  /** Session Supabase, ou null si non connecté */
  session: Session | null
  /** User Supabase (= auth.users), ou null */
  user: User | null
  /** Profil applicatif (= public.profiles), ou null */
  profile: Profile | null
  /** Rôle (extrait du profil) */
  role: UserRole | null
  /** Établissement de rattachement (null pour superadmin) */
  establishmentId: string | null
  /** Tenant actif choisi par un superadmin pour l'incarnation/support */
  activeEstablishmentId: string | null
  /** Erreur éventuelle de récupération de la session ou du profil */
  error: string | null
}

export const initialAuthState: AuthState = {
  loading: true,
  session: null,
  user: null,
  profile: null,
  role: null,
  establishmentId: null,
  activeEstablishmentId: null,
  error: null,
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Récupère le profil complet d'un user. À appeler après signin.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[auth] fetchProfile:', error.message)
    return null
  }
  return (data as Profile | null) ?? null
}

/**
 * Récupère la liste des élèves dont l'utilisateur est référent.
 * Utilisé pour les permissions client (UX), la RLS reste source de vérité.
 */
export async function fetchReferentStudentIds(
  profileId: string,
): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getSupabase()

  // 1. Récupérer le teacher.id lié à ce profile
  const { data: teacher, error: tErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle<{ id: string }>()
  if (tErr || !teacher) {
    if (tErr) console.error('[auth] fetchReferentStudentIds (teacher):', tErr.message)
    return []
  }

  // 2. Récupérer les student_id des assignments de ce teacher
  const { data: assignments, error: aErr } = await supabase
    .from('teacher_assignments')
    .select('student_id')
    .eq('teacher_id', teacher.id)
    .returns<Array<{ student_id: string }>>()
  if (aErr) {
    console.error('[auth] fetchReferentStudentIds (assignments):', aErr.message)
    return []
  }

  return (assignments ?? []).map((r) => r.student_id)
}

// ----------------------------------------------------------------------------
// Sign-in / Sign-out
// ----------------------------------------------------------------------------

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoMode()) {
    return {
      ok: false,
      error: 'Mode démo actif. Désactiver VITE_DEMO_MODE pour utiliser l\'auth réelle.',
    }
  }
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function resetPasswordForEmail(
  email: string,
  redirectTo?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoMode()) {
    return { ok: false, error: 'Mode demo actif.' }
  }
  const supabase = getSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) return
  const supabase = getSupabase()
  await supabase.auth.signOut()
}

// ----------------------------------------------------------------------------
// Session courante (ponctuelle, sans subscription)
// ----------------------------------------------------------------------------

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function readActiveEstablishmentId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, unknown>
  const value = record.active_establishment_id
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return null
  }
  const expiresAt = record.active_establishment_expires_at
  if (typeof expiresAt === 'string' && expiresAt.length > 0) {
    const expiry = new Date(expiresAt)
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) return null
  }
  return value
}

export async function getActiveEstablishmentScope(): Promise<string | null> {
  const session = await getCurrentSession()
  return readActiveEstablishmentId(session?.user.user_metadata)
}

/**
 * Construit un AuthState complet à partir de la session courante.
 * Idéal pour les loaders TanStack Router.
 */
export async function buildAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { ...initialAuthState, loading: false }
  }

  try {
    const session = await getCurrentSession()
    if (!session) {
      return { ...initialAuthState, loading: false }
    }

    const profile = await fetchProfile(session.user.id)
    const activeEstablishmentId = readActiveEstablishmentId(session.user.user_metadata)
    return {
      loading: false,
      session,
      user: session.user,
      profile,
      role: profile?.role ?? null,
      establishmentId: profile?.establishment_id ?? null,
      activeEstablishmentId,
      error: profile ? null : 'Profil introuvable. Contacter un administrateur.',
    }
  } catch (e) {
    return {
      ...initialAuthState,
      loading: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ----------------------------------------------------------------------------
// Subscription aux changements de session (à utiliser dans un Provider React)
// ----------------------------------------------------------------------------

export type AuthSubscriber = (state: AuthState) => void

export function subscribeToAuthChanges(callback: AuthSubscriber): () => void {
  if (!isSupabaseConfigured()) {
    callback({ ...initialAuthState, loading: false })
    return () => {}
  }
  const supabase = getSupabase()
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting other Supabase calls directly inside
    // onAuthStateChange callbacks because it can deadlock the auth client.
    window.setTimeout(async () => {
      if (!session) {
        callback({ ...initialAuthState, loading: false })
        return
      }
      const profile = await fetchProfile(session.user.id)
      const activeEstablishmentId = readActiveEstablishmentId(session.user.user_metadata)
      callback({
        loading: false,
        session,
        user: session.user,
        profile,
        role: profile?.role ?? null,
        establishmentId: profile?.establishment_id ?? null,
        activeEstablishmentId,
        error: profile ? null : 'Profil introuvable.',
      })
    }, 0)
  })
  return () => data.subscription.unsubscribe()
}
