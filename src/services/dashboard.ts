import { getSupabase } from '@/lib/supabase'
import type {
  AlertRow,
  AuditLogRow,
  CompanyRow,
  DocumentRow,
  PfmpPeriodRow,
  PlacementRow,
  TeacherAssignmentRow,
  TeacherRow,
} from '@/lib/database.types'

const STAGE_ACTIVE_STATUSES = ['signed_convention', 'in_progress', 'completed']
const TEACHER_OVERLOAD_THRESHOLD = 6

export interface DashboardKpis {
  studentsTotal: number
  studentsInStage: number
  studentsNoStage: number
  visitsDone: number
  visitsLate: number
  conventionsMissing: number
  attestationsMissing: number
  criticalMissing: number
  assignmentRate: number
  visitRate: number
  documentsReadyRate: number
}

export interface DashboardTeacherLoad {
  teacherId: string
  firstName: string
  lastName: string
  load: number
  overloaded: boolean
}

export interface DashboardCompanyNetwork {
  totalCompanies: number
  activeOnPeriod: number
  strongPartners: number
  toRecontact: number
  familiesCovered: number
  familiesTotal: number
  topSectors: Array<{ sector: string; count: number }>
  toRecontactCompanies: Array<{ id: string; name: string; city: string | null }>
  underrepresentedFamilies: string[]
}

export interface DashboardData {
  currentPeriod: PfmpPeriodRow | null
  kpis: DashboardKpis
  teacherLoads: DashboardTeacherLoad[]
  companyNetwork: DashboardCompanyNetwork
  alerts: AlertRow[]
  activity: AuditLogRow[]
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const sb = getSupabase()
  const currentPeriod = await fetchCurrentPeriod()
  const periodId = currentPeriod?.id

  if (!periodId) {
    const [alerts, activity] = await Promise.all([fetchAlerts(), fetchActivityLog()])
    return {
      currentPeriod,
      kpis: emptyKpis(0),
      teacherLoads: [],
      companyNetwork: emptyCompanyNetwork(),
      alerts,
      activity,
    }
  }

  const [
    placementsResult,
    visitsResult,
    documentsResult,
    teachersResult,
    companiesResult,
    alerts,
    activity,
  ] = await Promise.all([
    sb.from('placements').select('status, company_id, referent_id').eq('period_id', periodId),
    sb
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('period_id', periodId)
      .eq('status', 'validated'),
    sb.from('documents').select('type, status').eq('period_id', periodId),
    sb.from('teachers').select('id, first_name, last_name').order('last_name'),
    sb
      .from('companies')
      .select('id, name, city, sector, professional_family, status, students_hosted')
      .order('name'),
    fetchAlerts(50),
    fetchActivityLog(),
  ])

  if (placementsResult.error) {
    throw new Error(`fetchDashboardData placements: ${placementsResult.error.message}`)
  }
  if (visitsResult.error) {
    throw new Error(`fetchDashboardData visits: ${visitsResult.error.message}`)
  }
  if (documentsResult.error) {
    throw new Error(`fetchDashboardData documents: ${documentsResult.error.message}`)
  }
  if (teachersResult.error) {
    throw new Error(`fetchDashboardData teachers: ${teachersResult.error.message}`)
  }
  if (companiesResult.error) {
    throw new Error(`fetchDashboardData companies: ${companiesResult.error.message}`)
  }

  const placements =
    (placementsResult.data as Pick<PlacementRow, 'status' | 'company_id' | 'referent_id'>[]) ?? []
  const documents = (documentsResult.data as Pick<DocumentRow, 'type' | 'status'>[]) ?? []
  const teachers =
    (teachersResult.data as Pick<TeacherRow, 'id' | 'first_name' | 'last_name'>[]) ?? []
  const companies =
    (companiesResult.data as Pick<
      CompanyRow,
      'id' | 'name' | 'city' | 'sector' | 'professional_family' | 'status' | 'students_hosted'
    >[]) ?? []

  return {
    currentPeriod,
    kpis: buildKpisFromRows(placements, documents, alerts, visitsResult.count ?? 0),
    teacherLoads: buildTeacherLoadsFromRows(teachers, placements),
    companyNetwork: buildCompanyNetworkFromRows(companies, placements),
    alerts: alerts.slice(0, 6),
    activity,
  }
}

export async function fetchCurrentPeriod(): Promise<PfmpPeriodRow | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('pfmp_periods')
    .select('*')
    .eq('status', 'in_progress')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`fetchCurrentPeriod: ${error.message}`)
  return (data as PfmpPeriodRow | null) ?? null
}

export async function fetchDashboardKpis(periodId?: string): Promise<DashboardKpis> {
  const studentsTotal = await countRows('students')

  if (!periodId) {
    return emptyKpis(studentsTotal)
  }

  const [
    placementsTotal,
    studentsInStage,
    visitsDone,
    visitsLate,
    conventionsMissing,
    attestationsMissing,
  ] = await Promise.all([
    countRows('placements', (q) => q.eq('period_id', periodId)),
    countRows('placements', (q) =>
      q.eq('period_id', periodId).in('status', STAGE_ACTIVE_STATUSES),
    ),
    countRows('visits', (q) => q.eq('period_id', periodId).eq('status', 'validated')),
    countRows('alerts', (q) => q.eq('type', 'visit_late').eq('resolved', false)),
    countRows('documents', (q) =>
      q.eq('period_id', periodId).eq('type', 'convention').eq('status', 'missing'),
    ),
    countRows('documents', (q) =>
      q.eq('period_id', periodId).eq('type', 'attestation').eq('status', 'missing'),
    ),
  ])

  const studentsNoStage = Math.max(placementsTotal - studentsInStage, 0)
  const criticalMissing = conventionsMissing + attestationsMissing

  return {
    studentsTotal,
    studentsInStage,
    studentsNoStage,
    visitsDone,
    visitsLate,
    conventionsMissing,
    attestationsMissing,
    criticalMissing,
    assignmentRate: percent(studentsInStage, placementsTotal),
    visitRate: percent(visitsDone, placementsTotal),
    documentsReadyRate: percent(Math.max(placementsTotal - criticalMissing, 0), placementsTotal),
  }
}

export async function fetchTeacherLoads(periodId?: string): Promise<DashboardTeacherLoad[]> {
  const sb = getSupabase()
  const [{ data: teachers, error: teachersError }, assignmentsResult] = await Promise.all([
    sb.from('teachers').select('id, first_name, last_name').order('last_name'),
    periodId
      ? sb.from('teacher_assignments').select('teacher_id').eq('period_id', periodId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (teachersError) throw new Error(`fetchTeacherLoads teachers: ${teachersError.message}`)
  if (assignmentsResult.error) {
    throw new Error(`fetchTeacherLoads assignments: ${assignmentsResult.error.message}`)
  }

  const counts = new Map<string, number>()
  for (const row of (assignmentsResult.data as TeacherAssignmentRow[]) ?? []) {
    counts.set(row.teacher_id, (counts.get(row.teacher_id) ?? 0) + 1)
  }

  return ((teachers as Pick<TeacherRow, 'id' | 'first_name' | 'last_name'>[]) ?? []).map(
    (teacher) => {
      const load = counts.get(teacher.id) ?? 0
      return {
        teacherId: teacher.id,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        load,
        overloaded: load > TEACHER_OVERLOAD_THRESHOLD,
      }
    },
  )
}

export async function fetchCompanyNetwork(periodId?: string): Promise<DashboardCompanyNetwork> {
  const sb = getSupabase()
  const [{ data: companies, error: companiesError }, placementsResult] = await Promise.all([
    sb
      .from('companies')
      .select('id, name, city, sector, professional_family, status, students_hosted')
      .order('name'),
    periodId
      ? sb.from('placements').select('company_id').eq('period_id', periodId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (companiesError) throw new Error(`fetchCompanyNetwork companies: ${companiesError.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchCompanyNetwork placements: ${placementsResult.error.message}`)
  }

  const companyRows =
    (companies as Pick<
      CompanyRow,
      'id' | 'name' | 'city' | 'sector' | 'professional_family' | 'status' | 'students_hosted'
    >[]) ?? []
  const activeCompanyIds = new Set(
    (((placementsResult.data as Array<{ company_id: string | null }>) ?? [])
      .map((p) => p.company_id)
      .filter(Boolean) as string[]),
  )
  const familyCounts = new Map<string, number>()
  const sectorCounts = new Map<string, number>()

  for (const company of companyRows) {
    if (company.professional_family) {
      familyCounts.set(
        company.professional_family,
        (familyCounts.get(company.professional_family) ?? 0) + 1,
      )
    }
    const sector = company.sector || 'Non renseigne'
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1)
  }

  const familiesCovered = new Set(
    companyRows
      .filter((company) => activeCompanyIds.has(company.id) && company.professional_family)
      .map((company) => company.professional_family as string),
  )

  return {
    totalCompanies: companyRows.length,
    activeOnPeriod: activeCompanyIds.size,
    strongPartners: companyRows.filter((company) => company.students_hosted >= 3).length,
    toRecontact: companyRows.filter(
      (company) => company.status === 'to_recontact' || company.status === 'to_watch',
    ).length,
    familiesCovered: familiesCovered.size,
    familiesTotal: familyCounts.size,
    topSectors: [...sectorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector, count]) => ({ sector, count })),
    toRecontactCompanies: companyRows
      .filter((company) => company.status === 'to_recontact' || company.status === 'to_watch')
      .slice(0, 3)
      .map((company) => ({ id: company.id, name: company.name, city: company.city })),
    underrepresentedFamilies: [...familyCounts.entries()]
      .filter(([, count]) => count <= 1)
      .map(([family]) => family),
  }
}

export async function fetchAlerts(limit = 6): Promise<AlertRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('alerts')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`fetchAlerts: ${error.message}`)
  return (data as AlertRow[]) ?? []
}

export async function fetchActivityLog(limit = 6): Promise<AuditLogRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`fetchActivityLog: ${error.message}`)
  return (data as AuditLogRow[]) ?? []
}

function emptyKpis(studentsTotal: number): DashboardKpis {
  return {
    studentsTotal,
    studentsInStage: 0,
    studentsNoStage: 0,
    visitsDone: 0,
    visitsLate: 0,
    conventionsMissing: 0,
    attestationsMissing: 0,
    criticalMissing: 0,
    assignmentRate: 0,
    visitRate: 0,
    documentsReadyRate: 0,
  }
}

function emptyCompanyNetwork(): DashboardCompanyNetwork {
  return {
    totalCompanies: 0,
    activeOnPeriod: 0,
    strongPartners: 0,
    toRecontact: 0,
    familiesCovered: 0,
    familiesTotal: 0,
    topSectors: [],
    toRecontactCompanies: [],
    underrepresentedFamilies: [],
  }
}

function buildKpisFromRows(
  placements: Pick<PlacementRow, 'status' | 'company_id' | 'referent_id'>[],
  documents: Pick<DocumentRow, 'type' | 'status'>[],
  alerts: AlertRow[],
  visitsDone: number,
): DashboardKpis {
  const placementsTotal = placements.length
  const studentsInStage = placements.filter((placement) =>
    STAGE_ACTIVE_STATUSES.includes(placement.status),
  ).length
  const studentsNoStage = Math.max(placementsTotal - studentsInStage, 0)
  const conventionsMissing = documents.filter(
    (document) => document.type === 'convention' && document.status === 'missing',
  ).length
  const attestationsMissing = documents.filter(
    (document) => document.type === 'attestation' && document.status === 'missing',
  ).length
  const criticalMissing = conventionsMissing + attestationsMissing

  return {
    studentsTotal: placementsTotal,
    studentsInStage,
    studentsNoStage,
    visitsDone,
    visitsLate: alerts.filter((alert) => alert.type === 'visit_late').length,
    conventionsMissing,
    attestationsMissing,
    criticalMissing,
    assignmentRate: percent(studentsInStage, placementsTotal),
    visitRate: percent(visitsDone, placementsTotal),
    documentsReadyRate: percent(Math.max(placementsTotal - criticalMissing, 0), placementsTotal),
  }
}

function buildTeacherLoadsFromRows(
  teachers: Pick<TeacherRow, 'id' | 'first_name' | 'last_name'>[],
  placements: Pick<PlacementRow, 'status' | 'company_id' | 'referent_id'>[],
): DashboardTeacherLoad[] {
  const counts = new Map<string, number>()
  for (const placement of placements) {
    if (placement.referent_id) {
      counts.set(placement.referent_id, (counts.get(placement.referent_id) ?? 0) + 1)
    }
  }

  return teachers.map((teacher) => {
    const load = counts.get(teacher.id) ?? 0
    return {
      teacherId: teacher.id,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      load,
      overloaded: load > TEACHER_OVERLOAD_THRESHOLD,
    }
  })
}

function buildCompanyNetworkFromRows(
  companies: Pick<
    CompanyRow,
    'id' | 'name' | 'city' | 'sector' | 'professional_family' | 'status' | 'students_hosted'
  >[],
  placements: Pick<PlacementRow, 'status' | 'company_id' | 'referent_id'>[],
): DashboardCompanyNetwork {
  const activeCompanyIds = new Set(
    placements.map((placement) => placement.company_id).filter(Boolean) as string[],
  )
  const familyCounts = new Map<string, number>()
  const sectorCounts = new Map<string, number>()

  for (const company of companies) {
    if (company.professional_family) {
      familyCounts.set(
        company.professional_family,
        (familyCounts.get(company.professional_family) ?? 0) + 1,
      )
    }
    const sector = company.sector || 'Non renseigne'
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1)
  }

  const familiesCovered = new Set(
    companies
      .filter((company) => activeCompanyIds.has(company.id) && company.professional_family)
      .map((company) => company.professional_family as string),
  )

  return {
    totalCompanies: companies.length,
    activeOnPeriod: activeCompanyIds.size,
    strongPartners: companies.filter((company) => company.students_hosted >= 3).length,
    toRecontact: companies.filter(
      (company) => company.status === 'to_recontact' || company.status === 'to_watch',
    ).length,
    familiesCovered: familiesCovered.size,
    familiesTotal: familyCounts.size,
    topSectors: [...sectorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector, count]) => ({ sector, count })),
    toRecontactCompanies: companies
      .filter((company) => company.status === 'to_recontact' || company.status === 'to_watch')
      .slice(0, 3)
      .map((company) => ({ id: company.id, name: company.name, city: company.city })),
    underrepresentedFamilies: [...familyCounts.entries()]
      .filter(([, count]) => count <= 1)
      .map(([family]) => family),
  }
}

async function countRows(table: string, apply?: (query: any) => any): Promise<number> {
  const sb = getSupabase()
  let query = sb.from(table).select('*', { count: 'exact', head: true })
  if (apply) query = apply(query)
  const { count, error } = await query
  if (error) throw new Error(`countRows(${table}): ${error.message}`)
  return count ?? 0
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}
