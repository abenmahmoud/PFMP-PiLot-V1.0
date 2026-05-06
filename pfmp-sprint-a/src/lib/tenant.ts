/**
 * Multi-tenant Vercel — résolution du tenant depuis le hostname.
 *
 * Stratégie de routing prévue :
 *
 *   localhost / 127.0.0.1                → mode démo / pas de tenant
 *   *.pfmp-pilot.fr (apex)               → landing publique / superadmin
 *   <slug>.pfmp-pilot.fr                 → tenant par sous-domaine
 *   <custom_domain>                      → tenant par domaine propre
 *
 * Ce fichier ne fait QUE le parsing du hostname. La résolution réelle
 * vers un Establishment se fera côté serveur (Edge Function ou loader
 * TanStack Router) via :
 *
 *   select id from establishments
 *    where slug = $1 or subdomain = $1 or custom_domain = $1 limit 1;
 *
 * Pour l'instant, ce module n'est PAS encore branché dans le frontend.
 * Le multi-tenant routing est différé à l'étape "middleware Vercel" qui
 * arrivera après le branchement Supabase Auth.
 */

import type { EstablishmentRow } from './database.types'

export const PLATFORM_DOMAIN = 'pfmp-pilot.fr'

export type Establishment = EstablishmentRow

export interface TenantResolution {
  /** Type de hostname détecté */
  kind: 'local' | 'platform-apex' | 'subdomain' | 'custom-domain'
  /** Slug ou sous-domaine extrait, si applicable */
  slug: string | null
  /** Le hostname custom complet, si custom-domain */
  customDomain: string | null
  /** Hostname brut analysé */
  hostname: string
}

export function getHostname(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.toLowerCase()
}

export function isLocalHostname(hostname: string): boolean {
  if (!hostname) return true
  if (hostname === 'localhost') return true
  if (hostname === '127.0.0.1' || hostname === '0.0.0.0') return true
  if (hostname.endsWith('.local')) return true
  return false
}

export function isPlatformDomain(hostname: string): boolean {
  return hostname === PLATFORM_DOMAIN || hostname.endsWith('.' + PLATFORM_DOMAIN)
}

export function isPlatformApex(hostname: string): boolean {
  return hostname === PLATFORM_DOMAIN || hostname === `www.${PLATFORM_DOMAIN}`
}

export function isCustomDomain(hostname: string): boolean {
  if (!hostname) return false
  if (isLocalHostname(hostname)) return false
  if (isPlatformDomain(hostname)) return false
  return true
}

/**
 * Extrait le slug d'un sous-domaine de la plateforme.
 * Exemples :
 *   "jean-moulin.pfmp-pilot.fr" → "jean-moulin"
 *   "pfmp-pilot.fr"             → null
 *   "www.pfmp-pilot.fr"         → null
 *   "lycee.example.com"         → null (custom domain)
 */
export function extractTenantSlug(hostname: string): string | null {
  if (!hostname) return null
  if (!isPlatformDomain(hostname)) return null
  if (isPlatformApex(hostname)) return null
  // hostname est <slug>.pfmp-pilot.fr ou <slug>.<sub>.pfmp-pilot.fr
  const suffix = '.' + PLATFORM_DOMAIN
  if (!hostname.endsWith(suffix)) return null
  const prefix = hostname.slice(0, -suffix.length)
  // On ne supporte qu'un seul niveau de sous-domaine pour l'instant
  if (prefix.includes('.')) return null
  if (prefix === 'www') return null
  return prefix || null
}

/**
 * Analyse complète du hostname courant.
 */
export function resolveTenantFromHostname(hostname?: string): TenantResolution {
  const h = (hostname ?? getHostname()).toLowerCase()

  if (isLocalHostname(h)) {
    return { kind: 'local', slug: null, customDomain: null, hostname: h }
  }
  if (isPlatformApex(h)) {
    return { kind: 'platform-apex', slug: null, customDomain: null, hostname: h }
  }
  if (isPlatformDomain(h)) {
    return { kind: 'subdomain', slug: extractTenantSlug(h), customDomain: null, hostname: h }
  }
  return { kind: 'custom-domain', slug: null, customDomain: h, hostname: h }
}

/**
 * Construit le sous-domaine pfmp-pilot.fr d'un établissement à partir de son slug.
 */
export function buildSubdomainUrl(slug: string): string {
  return `https://${slug}.${PLATFORM_DOMAIN}`
}

// ----------------------------------------------------------------------------
// Lookup d'un établissement par hostname (à appeler côté serveur ou loader)
// ----------------------------------------------------------------------------

import { getSupabase, isSupabaseConfigured } from './supabase'

/**
 * Cherche un établissement par hostname. Retourne null si pas trouvé OU si
 * Supabase n'est pas configuré (mode démo).
 *
 * En mode démo, le frontend continue d'utiliser ESTABLISHMENT_ID de demo.ts.
 *
 * NOTE : à brancher dans un loader TanStack Router une fois que les pages
 * sont reliées à Supabase. Pour l'instant, juste dispo pour usage manuel.
 */
export async function getTenantFromHostname(
  hostname: string,
): Promise<Establishment | null> {
  if (!isSupabaseConfigured()) return null

  const r = resolveTenantFromHostname(hostname)
  if (r.kind === 'local' || r.kind === 'platform-apex') return null

  const supabase = getSupabase()
  let query = supabase.from('establishments').select('*').eq('active', true).limit(1)

  if (r.kind === 'subdomain' && r.slug) {
    query = query.or(`slug.eq.${r.slug},subdomain.eq.${r.slug}`)
  } else if (r.kind === 'custom-domain' && r.customDomain) {
    query = query.eq('custom_domain', r.customDomain).eq('domain_verified', true)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle<EstablishmentRow>()
  if (error) {
    console.error('[tenant] erreur lookup:', error.message)
    return null
  }
  return data
}
