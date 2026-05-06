/**
 * Middleware serveur — résolution du tenant à chaque requête SSR.
 *
 * STATUT : CODE PRÊT MAIS PAS ACTIF.
 *
 * Pour activer ce middleware, deux options selon où tu veux faire la résolution :
 *
 * Option A — TanStack Start beforeLoad (le plus simple) :
 *   Dans src/router.tsx, sur le route __root, ajouter :
 *
 *     beforeLoad: async ({ location }) => {
 *       const tenant = await resolveServerTenant(location.href)
 *       return { tenant }
 *     }
 *
 *   Puis dans tes loaders enfants : `const { tenant } = Route.useRouteContext()`.
 *
 * Option B — Nitro middleware (intercepte avant tout) :
 *   Créer un fichier `src/server/middleware/tenant.ts` :
 *
 *     export default defineEventHandler(async (event) => {
 *       const host = getRequestHeader(event, 'host') ?? ''
 *       const tenant = await resolveServerTenant(host)
 *       event.context.tenant = tenant
 *     })
 *
 *   Puis lire `event.context.tenant` dans n'importe quelle Route Handler.
 *
 * On choisira A ou B au moment de brancher (Sprint 1 multi-tenant routing).
 * Pour l'instant, ce module n'est importé nulle part et n'a aucun effet.
 *
 * IMPORTANT — POURQUOI CE FICHIER EXISTE DÉJÀ :
 *   En préparant le code maintenant, on peut le brancher en quelques lignes
 *   dès que ton domaine pointe. Sans ça, il faudrait écrire ~100 lignes le
 *   jour J avec la pression du DNS qui propage. Mieux vaut l'avoir prêt.
 */

import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from '@/lib/supabase'
import {
  resolveTenantFromHostname,
  PLATFORM_DOMAIN,
  type Establishment,
  type TenantResolution,
} from '@/lib/tenant'

export interface ServerTenantContext {
  /** Type de résolution effectuée */
  resolution: TenantResolution
  /** Établissement résolu, ou null (apex, hostname inconnu, démo) */
  establishment: Establishment | null
  /** True si on est en mode démo (apex /demo, localhost, ou démo explicite) */
  isDemo: boolean
}

/**
 * Résout le tenant côté serveur depuis le hostname brut de la requête.
 *
 * Cette fonction est appelée à chaque requête SSR (loader / route handler).
 * Elle est volontairement légère : un seul appel Supabase qui hit l'index
 * unique sur (slug | subdomain | custom_domain).
 *
 * Une réponse pour 99% des cas : localhost et l'apex retournent immédiatement
 * sans appel réseau (économie latence).
 */
export async function resolveServerTenant(
  hostnameOrUrl: string,
): Promise<ServerTenantContext> {
  // Extraction du hostname brut depuis URL ou Host header
  let hostname = hostnameOrUrl.toLowerCase()
  if (hostname.includes('://')) {
    try {
      hostname = new URL(hostname).hostname
    } catch {
      hostname = ''
    }
  }
  // Strip port si présent
  if (hostname.includes(':')) hostname = hostname.split(':')[0]

  const resolution = resolveTenantFromHostname(hostname)

  // Cas 1 : localhost ou apex → pas de tenant, mode démo possible
  if (resolution.kind === 'local' || resolution.kind === 'platform-apex') {
    return {
      resolution,
      establishment: null,
      isDemo: resolution.kind === 'local',
    }
  }

  // Cas 2 : Supabase pas configuré → fallback démo silencieux (préserve le dev)
  if (!isSupabaseConfigured()) {
    return { resolution, establishment: null, isDemo: true }
  }

  // Cas 3 : subdomain ou custom_domain → lookup Supabase via REST direct.
  // On ne passe pas par getSupabase() ici parce que ce code peut tourner dans
  // un contexte Edge/Node serveur où le client browser n'est pas approprié.
  // Un appel REST direct est plus prévisible et plus rapide pour cette requête
  // unique (pas besoin de la machinerie de session/auth).
  const url = getSupabaseUrl()!
  const key = getSupabaseAnonKey()!

  let filter = ''
  if (resolution.kind === 'subdomain' && resolution.slug) {
    // OR sur slug et subdomain (un établissement peut avoir un alias)
    filter = `or=(slug.eq.${resolution.slug},subdomain.eq.${resolution.slug})`
  } else if (resolution.kind === 'custom-domain' && resolution.customDomain) {
    filter = `custom_domain=eq.${resolution.customDomain}&domain_verified=eq.true`
  } else {
    return { resolution, establishment: null, isDemo: false }
  }

  // active=true pour ignorer les tenants suspendus/archivés
  const endpoint = `${url}/rest/v1/establishments?${filter}&active=eq.true&limit=1&select=*`

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      console.error('[tenant] Supabase lookup failed:', res.status, await res.text())
      return { resolution, establishment: null, isDemo: false }
    }
    const rows = (await res.json()) as Establishment[]
    const establishment = rows[0] ?? null
    return { resolution, establishment, isDemo: false }
  } catch (e) {
    console.error('[tenant] lookup error:', e)
    return { resolution, establishment: null, isDemo: false }
  }
}

/**
 * Helper : construit la redirection appropriée pour un hostname donné.
 *
 * Cas typiques :
 *   - subdomain inconnu (ex : oubli-de-frappe.pfmp-pilot.fr)
 *     → redirect vers landing apex avec message d'erreur
 *   - custom_domain non vérifié
 *     → redirect vers le subdomain officiel
 *   - tenant suspendu
 *     → redirect vers /suspended (page à créer)
 */
export function getRedirectForUnresolvedTenant(
  resolution: TenantResolution,
): string | null {
  if (resolution.kind === 'subdomain' && resolution.slug) {
    return `https://${PLATFORM_DOMAIN}/?error=unknown-tenant&slug=${resolution.slug}`
  }
  if (resolution.kind === 'custom-domain' && resolution.customDomain) {
    return `https://${PLATFORM_DOMAIN}/?error=unverified-domain&domain=${resolution.customDomain}`
  }
  return null
}
