/**
 * Service Superadmin — agrégations multi-tenant côté Supabase.
 *
 * Approche MVP (≤ 50 établissements) : on fait 1 SELECT global par table
 * (limité par les policies RLS qui n'auront aucun effet pour un superadmin via
 * `is_superadmin()`), puis on agrège en JS par tenant. À 100+ tenants, basculer
 * sur une vue SQL `establishments_with_metrics`.
 *
 * Toutes les fonctions exposées ici nécessitent un superadmin authentifié.
 * La RLS empêchera physiquement un non-superadmin de récupérer les données
 * cross-tenant — donc même si l'UI se trompe, la sécurité tient.
 */

import { getSupabase } from '@/lib/supabase'
import type {
  AlertRow,
  CompanyRow,
  DocumentRow,
  EstablishmentRow,
  StudentRow,
  TutorRow,
  VisitRow,
} from '@/lib/database.types'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface EstablishmentWithMetrics {
  establishment: EstablishmentRow
  studentCount: number
  userCount: number
  companyCount: number
  strongPartnerCount: number
  companyCompletionRate: number // 0..100
  activityScore: number // 0..100
  lastConnectionAt: string | null
}

export interface CompanyNetworkAggregate {
  totalCompanies: number
  totalStrongPartners: number
  averageCompletionRate: number
  topSectors: Array<{ sector: string; count: number }>
  topFamilies: Array<{ family: string; count: number }>
  tutorsCount: number
}

export interface SuperadminOverview {
  establishments: EstablishmentWithMetrics[]
  totals: {
    establishmentsTotal: number
    establishmentsActive: number
    establishmentsInactive: number
    studentsTotal: number
    companiesTotal: number
    strongPartnersTotal: number
    lowActivityCount: number
    lowCompanyBaseCount: number
    averageCompletionRate: number
  }
  network: CompanyNetworkAggregate
  alerts: AlertRow[]
  visitsTotal: number
  visitsLate: number
  documentsMissing: number
}

export interface EstablishmentListItem extends EstablishmentWithMetrics {}

// --------------------------------------------------------------------------
// Constantes (alignées avec la roadmap)
// --------------------------------------------------------------------------

const LOW_ACTIVITY_THRESHOLD = 40
const LOW_COMPANY_THRESHOLD = 8
const STRONG_PARTNER_STATUS = 'strong_partner'
const TOP_N = 5
const ALERTS_LIMIT = 6

const COMPANY_FIELDS_FOR_COMPLETION: Array<keyof CompanyRow> = [
  'name',
  'address',
  'city',
  'zip_code',
  'phone',
  'email',
  'siret',
  'sector',
  'professional_family',
]

// --------------------------------------------------------------------------
// API publique
// --------------------------------------------------------------------------

/**
 * Charge la vue d'ensemble Superadmin : tous les établissements enrichis avec
 * leurs métriques + agrégats globaux + alertes top.
 */
export async function fetchSuperadminOverview(): Promise<SuperadminOverview> {
  const sb = getSupabase()

  const [
    establishmentsResult,
    studentsResult,
    profilesResult,
    companiesResult,
    tutorsResult,
    visitsResult,
    documentsResult,
    alertsResult,
  ] = await Promise.all([
    sb.from('establishments').select('*').order('name'),
    sb.from('students').select('id, establishment_id, archived_at'),
    sb.from('profiles').select('id, establishment_id, updated_at'),
    sb
      .from('companies')
      .select(
        'id, establishment_id, name, address, city, zip_code, phone, email, siret, sector, professional_family, status, archived_at',
      ),
    sb.from('tutors').select('id, establishment_id, archived_at'),
    sb.from('visits').select('id, establishment_id, date, status'),
    sb.from('documents').select('id, establishment_id, status, archived_at'),
    sb
      .from('alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(ALERTS_LIMIT),
  ])

  throwIfError('establishments', establishmentsResult.error)
  throwIfError('students', studentsResult.error)
  throwIfError('profiles', profilesResult.error)
  throwIfError('companies', companiesResult.error)
  throwIfError('tutors', tutorsResult.error)
  throwIfError('visits', visitsResult.error)
  throwIfError('documents', documentsResult.error)
  throwIfError('alerts', alertsResult.error)

  const establishments = (establishmentsResult.data as EstablishmentRow[]) ?? []
  const students = (studentsResult.data as Pick<StudentRow, 'id' | 'establishment_id' | 'archived_at'>[]) ?? []
  const profiles =
    (profilesResult.data as Array<{ id: string; establishment_id: string | null; updated_at: string }>) ?? []
  const companies =
    (companiesResult.data as Array<
      Pick<
        CompanyRow,
        | 'id'
        | 'establishment_id'
        | 'name'
        | 'address'
        | 'city'
        | 'zip_code'
        | 'phone'
        | 'email'
        | 'siret'
        | 'sector'
        | 'professional_family'
        | 'status'
        | 'archived_at'
      >
    >) ?? []
  const tutors = (tutorsResult.data as Pick<TutorRow, 'id' | 'establishment_id' | 'archived_at'>[]) ?? []
  const visits = (visitsResult.data as Pick<VisitRow, 'id' | 'establishment_id' | 'date' | 'status'>[]) ?? []
  const documents =
    (documentsResult.data as Pick<DocumentRow, 'id' | 'establishment_id' | 'status' | 'archived_at'>[]) ?? []
  const alerts = (alertsResult.data as AlertRow[]) ?? []

  // Index par establishment_id
  const studentsByEst = groupBy(
    students.filter((s) => !s.archived_at),
    (s) => s.establishment_id,
  )
  const profilesByEst = groupBy(
    profiles.filter((p) => p.establishment_id),
    (p) => p.establishment_id as string,
  )
  const companiesByEst = groupBy(
    companies.filter((c) => !c.archived_at),
    (c) => c.establishment_id,
  )
  const visitsByEst = groupBy(visits, (v) => v.establishment_id)

  // Métriques par établissement
  const enriched: EstablishmentWithMetrics[] = establishments.map((est) => {
    const estStudents = studentsByEst.get(est.id) ?? []
    const estProfiles = profilesByEst.get(est.id) ?? []
    const estCompanies = companiesByEst.get(est.id) ?? []
    const estVisits = visitsByEst.get(est.id) ?? []

    const strongPartners = estCompanies.filter((c) => c.status === STRONG_PARTNER_STATUS).length
    const completionRate = averageCompletionRate(estCompanies)
    const lastConnection = latestDate(estProfiles.map((p) => p.updated_at))
    const score = computeActivityScore({
      visits: estVisits.length,
      students: estStudents.length,
      companies: estCompanies.length,
      lastConnection,
    })

    return {
      establishment: est,
      studentCount: estStudents.length,
      userCount: estProfiles.length,
      companyCount: estCompanies.length,
      strongPartnerCount: strongPartners,
      companyCompletionRate: completionRate,
      activityScore: score,
      lastConnectionAt: lastConnection,
    }
  })

  // Totaux globaux
  const establishmentsActive = enriched.filter((e) => e.establishment.active).length
  const lowActivity = enriched.filter((e) => e.activityScore < LOW_ACTIVITY_THRESHOLD).length
  const lowCompanyBase = enriched.filter((e) => e.companyCount < LOW_COMPANY_THRESHOLD).length
  const totalCompanies = enriched.reduce((sum, e) => sum + e.companyCount, 0)
  const totalStrongPartners = enriched.reduce((sum, e) => sum + e.strongPartnerCount, 0)
  const studentsTotal = enriched.reduce((sum, e) => sum + e.studentCount, 0)
  const avgCompletion =
    enriched.length === 0
      ? 0
      : Math.round(enriched.reduce((sum, e) => sum + e.companyCompletionRate, 0) / enriched.length)

  // Network agrégé
  const sectorMap = new Map<string, number>()
  const familyMap = new Map<string, number>()
  for (const c of companies) {
    if (c.sector) sectorMap.set(c.sector, (sectorMap.get(c.sector) ?? 0) + 1)
    if (c.professional_family) {
      familyMap.set(c.professional_family, (familyMap.get(c.professional_family) ?? 0) + 1)
    }
  }
  const network: CompanyNetworkAggregate = {
    totalCompanies: companies.length,
    totalStrongPartners,
    averageCompletionRate: avgCompletion,
    topSectors: [...sectorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([sector, count]) => ({ sector, count })),
    topFamilies: [...familyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([family, count]) => ({ family, count })),
    tutorsCount: tutors.filter((t) => !t.archived_at).length,
  }

  return {
    establishments: enriched,
    totals: {
      establishmentsTotal: enriched.length,
      establishmentsActive,
      establishmentsInactive: enriched.length - establishmentsActive,
      studentsTotal,
      companiesTotal: totalCompanies,
      strongPartnersTotal: totalStrongPartners,
      lowActivityCount: lowActivity,
      lowCompanyBaseCount: lowCompanyBase,
      averageCompletionRate: avgCompletion,
    },
    network,
    alerts,
    visitsTotal: visits.length,
    visitsLate: alerts.filter((a) => a.type === 'visit_late').length,
    documentsMissing: documents.filter((d) => d.status === 'missing' && !d.archived_at).length,
  }
}

/**
 * Liste plate des établissements pour /superadmin/establishments.
 * Avec les mêmes métriques que l'overview.
 */
export async function fetchEstablishmentsList(search?: string): Promise<EstablishmentListItem[]> {
  const overview = await fetchSuperadminOverview()
  const items = overview.establishments
  const normalized = search?.trim().toLowerCase()
  if (!normalized) return items
  return items.filter((item) => {
    const e = item.establishment
    return (
      e.name.toLowerCase().includes(normalized) ||
      (e.city ?? '').toLowerCase().includes(normalized) ||
      (e.uai ?? '').toLowerCase().includes(normalized)
    )
  })
}

// --------------------------------------------------------------------------
// Helpers internes
// --------------------------------------------------------------------------

function throwIfError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`fetchSuperadminOverview ${label}: ${error.message}`)
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = map.get(k) ?? []
    list.push(row)
    map.set(k, list)
  }
  return map
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  return sorted[0] ?? null
}

function averageCompletionRate(companies: Array<Partial<CompanyRow>>): number {
  if (companies.length === 0) return 0
  const total = companies.reduce((sum, c) => sum + completionRate(c), 0)
  return Math.round(total / companies.length)
}

function completionRate(company: Partial<CompanyRow>): number {
  const completed = COMPANY_FIELDS_FOR_COMPLETION.filter((f) => Boolean(company[f])).length
  return Math.round((completed / COMPANY_FIELDS_FOR_COMPLETION.length) * 100)
}

/**
 * Score d'activité 0..100 basé sur 4 signaux pondérés.
 * Pondération : visites (40%), élèves suivis (25%), réseau entreprises (20%),
 * récence dernière connexion (15%).
 */
function computeActivityScore(input: {
  visits: number
  students: number
  companies: number
  lastConnection: string | null
}): number {
  const visitScore = Math.min(input.visits / 30, 1) * 40
  const studentScore = Math.min(input.students / 200, 1) * 25
  const companyScore = Math.min(input.companies / 50, 1) * 20
  const recencyScore = recencyToScore(input.lastConnection) * 15
  return Math.round(visitScore + studentScore + companyScore + recencyScore)
}

function recencyToScore(lastConnection: string | null): number {
  if (!lastConnection) return 0
  const daysSince = (Date.now() - new Date(lastConnection).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 7) return 1
  if (daysSince <= 30) return 0.6
  if (daysSince <= 90) return 0.3
  return 0.1
}
