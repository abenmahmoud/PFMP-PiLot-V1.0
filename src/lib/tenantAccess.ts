import type { EstablishmentRow } from '@/lib/database.types'
import { buildSubdomainUrl } from '@/lib/tenant'

export type TenantAccessKind = 'platform-subdomain' | 'custom-domain'

export interface TenantAccessInfo {
  kind: TenantAccessKind
  url: string
  platformUrl: string
  slug: string
  label: string
  description: string
}

export function getTenantAccessSlug(establishment: Pick<EstablishmentRow, 'slug' | 'subdomain'>): string {
  return establishment.subdomain?.trim() || establishment.slug
}

export function buildTenantPlatformUrl(
  establishment: Pick<EstablishmentRow, 'slug' | 'subdomain'>,
): string {
  return buildSubdomainUrl(getTenantAccessSlug(establishment))
}

export function buildTenantAccessUrl(
  establishment: Pick<EstablishmentRow, 'slug' | 'subdomain' | 'custom_domain' | 'domain_verified'>,
): string {
  if (establishment.custom_domain?.trim() && establishment.domain_verified) {
    return `https://${establishment.custom_domain.trim().toLowerCase()}`
  }
  return buildTenantPlatformUrl(establishment)
}

export function getTenantAccessInfo(
  establishment: Pick<EstablishmentRow, 'slug' | 'subdomain' | 'custom_domain' | 'domain_verified'>,
): TenantAccessInfo {
  const slug = getTenantAccessSlug(establishment)
  const platformUrl = buildTenantPlatformUrl(establishment)
  const hasVerifiedCustomDomain = Boolean(establishment.custom_domain?.trim() && establishment.domain_verified)

  if (hasVerifiedCustomDomain) {
    return {
      kind: 'custom-domain',
      url: buildTenantAccessUrl(establishment),
      platformUrl,
      slug,
      label: 'Domaine personnalise verifie',
      description: "Ce domaine est le lien principal de l'etablissement.",
    }
  }

  return {
    kind: 'platform-subdomain',
    url: platformUrl,
    platformUrl,
    slug,
    label: 'Sous-domaine PFMP Pilot',
    description: "Lien officiel de l'espace etablissement sur la plateforme.",
  }
}
