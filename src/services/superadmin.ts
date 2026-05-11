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
  AuditLogRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  EstablishmentRow,
  EstablishmentSettingsRow,
  PfmpPeriodRow,
  ProfileRow,
  StudentRow,
  TeacherRow,
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

export interface CreateEstablishmentInput {
  name: string
  city: string | null
  uai: string | null
  slug: string
  primaryColor: string | null
  schoolYear: string | null
  teacherLoadThreshold: number
}

export interface CreateEstablishmentResult {
  establishment: EstablishmentRow
  settings: EstablishmentSettingsRow | null
}

export interface EstablishmentDetail {
  establishment: EstablishmentRow
  settings: EstablishmentSettingsRow | null
  profiles: ProfileRow[]
  classes: ClassRow[]
  periods: PfmpPeriodRow[]
  auditLogs: AuditLogRow[]
  metrics: {
    users: number
    classes: number
    students: number
    teachers: number
    companies: number
    periods: number
    visits: number
    documents: number
    openAlerts: number
  }
}

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

/**
 * Cree un tenant et ses settings de base.
 *
 * Scope P1.0 minimal : pas encore d'invitation DDFPT/admin ni magic link.
 * La RLS impose que seul un superadmin puisse inserer ces lignes.
 */
export async function createEstablishment(
  input: CreateEstablishmentInput,
): Promise<CreateEstablishmentResult> {
  const sb = getSupabase()

  const { data: establishment, error: establishmentError } = await sb
    .from('establishments')
    .insert({
      name: input.name,
      city: input.city,
      uai: input.uai,
      slug: input.slug,
      primary_color: input.primaryColor,
      status: 'trial',
      active: true,
    })
    .select('*')
    .single()

  if (establishmentError) {
    throw new Error(`createEstablishment establishment: ${establishmentError.message}`)
  }

  const createdEstablishment = establishment as EstablishmentRow

  const { data: settings, error: settingsError } = await sb
    .from('establishment_settings')
    .insert({
      establishment_id: createdEstablishment.id,
      school_year: input.schoolYear,
      teacher_load_threshold: input.teacherLoadThreshold,
      ai_enabled: false,
      rgpd_notice: null,
      logo_url: null,
    })
    .select('*')
    .maybeSingle()

  if (settingsError) {
    throw new Error(`createEstablishment settings: ${settingsError.message}`)
  }

  await sb.from('audit_logs').insert({
    establishment_id: createdEstablishment.id,
    action: 'establishment.created',
    description: `Etablissement cree : ${createdEstablishment.name}`,
    metadata: {
      slug: createdEstablishment.slug,
      status: createdEstablishment.status,
      source: 'superadmin.establishments.new',
    },
  })

  return {
    establishment: createdEstablishment,
    settings: (settings as EstablishmentSettingsRow | null) ?? null,
  }
}

/**
 * Detail superadmin d'un tenant.
 *
 * Le superadmin peut lire cross-tenant via RLS. Les comptes et metriques sont
 * agregees cote frontend pour rester simples tant que le nombre de tenants est
 * faible. A terme, une vue SQL dediee remplacera ces SELECT.
 */
export async function fetchEstablishmentDetail(id: string): Promise<EstablishmentDetail | null> {
  const sb = getSupabase()

  const [
    establishmentResult,
    settingsResult,
    profilesResult,
    classesResult,
    studentsResult,
    teachersResult,
    companiesResult,
    periodsResult,
    visitsResult,
    documentsResult,
    alertsResult,
    auditLogsResult,
  ] = await Promise.all([
    sb.from('establishments').select('*').eq('id', id).maybeSingle(),
    sb.from('establishment_settings').select('*').eq('establishment_id', id).maybeSingle(),
    sb.from('profiles').select('*').eq('establishment_id', id).order('last_name'),
    sb.from('classes').select('*').eq('establishment_id', id).order('name'),
    sb.from('students').select('id').eq('establishment_id', id).is('archived_at', null),
    sb.from('teachers').select('*').eq('establishment_id', id).is('archived_at', null),
    sb.from('companies').select('id').eq('establishment_id', id).is('archived_at', null),
    sb.from('pfmp_periods').select('*').eq('establishment_id', id).order('start_date', { ascending: false }),
    sb.from('visits').select('id').eq('establishment_id', id),
    sb.from('documents').select('id').eq('establishment_id', id).is('archived_at', null),
    sb.from('alerts').select('id').eq('establishment_id', id).eq('resolved', false),
    sb
      .from('audit_logs')
      .select('*')
      .eq('establishment_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  throwSupabaseError('fetchEstablishmentDetail establishment', establishmentResult.error)
  throwSupabaseError('fetchEstablishmentDetail settings', settingsResult.error)
  throwSupabaseError('fetchEstablishmentDetail profiles', profilesResult.error)
  throwSupabaseError('fetchEstablishmentDetail classes', classesResult.error)
  throwSupabaseError('fetchEstablishmentDetail students', studentsResult.error)
  throwSupabaseError('fetchEstablishmentDetail teachers', teachersResult.error)
  throwSupabaseError('fetchEstablishmentDetail companies', companiesResult.error)
  throwSupabaseError('fetchEstablishmentDetail periods', periodsResult.error)
  throwSupabaseError('fetchEstablishmentDetail visits', visitsResult.error)
  throwSupabaseError('fetchEstablishmentDetail documents', documentsResult.error)
  throwSupabaseError('fetchEstablishmentDetail alerts', alertsResult.error)
  throwSupabaseError('fetchEstablishmentDetail auditLogs', auditLogsResult.error)

  const establishment = establishmentResult.data as EstablishmentRow | null
  if (!establishment) return null

  const profiles = (profilesResult.data ?? []) as ProfileRow[]
  const classes = (classesResult.data ?? []) as ClassRow[]
  const periods = (periodsResult.data ?? []) as PfmpPeriodRow[]
  const auditLogs = (auditLogsResult.data ?? []) as AuditLogRow[]

  return {
    establishment,
    settings: (settingsResult.data as EstablishmentSettingsRow | null) ?? null,
    profiles,
    classes,
    periods,
    auditLogs,
    metrics: {
      users: profiles.length,
      classes: classes.length,
      students: (studentsResult.data ?? []).length,
      teachers: ((teachersResult.data ?? []) as TeacherRow[]).length,
      companies: (companiesResult.data ?? []).length,
      periods: periods.length,
      visits: (visitsResult.data ?? []).length,
      documents: (documentsResult.data ?? []).length,
      openAlerts: (alertsResult.data ?? []).length,
    },
  }
}

// --------------------------------------------------------------------------
// Helpers internes
// --------------------------------------------------------------------------

function throwIfError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`fetchSuperadminOverview ${label}: ${error.message}`)
}

function throwSupabaseError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`)
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
