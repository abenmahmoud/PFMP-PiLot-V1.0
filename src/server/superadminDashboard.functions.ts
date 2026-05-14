import { createServerFn } from '@tanstack/react-start'
import type {
  AlertRow,
  AuditLogRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  EstablishmentRow,
  EstablishmentSettingsRow,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StudentRow,
  TeacherRow,
  TutorRow,
  VisitRow,
} from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

export interface GlobalKpis {
  total_establishments: number
  total_students: number
  total_placements_active: number
  placement_rate: number
  total_visits_planned: number
  total_visits_done: number
  top_companies_by_volume: Array<{ companyId: string; name: string; placements: number }>
  alerts_count: number
}

export interface EstablishmentBreakdownItem {
  establishment: EstablishmentRow
  students: number
  placements: number
  placement_rate: number
  pending_actions: number
  last_activity: string | null
  classes: number
  companies: number
  teachers: number
  alerts: number
}

export interface SharedCompanyInsight {
  name: string
  cities: string[]
  establishments: Array<{ id: string; name: string }>
  placements: number
}

export interface ReferentVisitInsight {
  profileId: string
  name: string
  establishmentName: string
  visits: number
}

export interface StudentRiskInsight {
  studentId: string
  studentName: string
  className: string | null
  establishmentId: string
  establishmentName: string
  periodId: string
  periodName: string
  startsAt: string
  daysBeforeStart: number
}

export interface ComplianceCheck {
  key: string
  label: string
  status: 'ok' | 'warning' | 'danger'
  detail: string
}

export interface CrossEstablishmentInsights {
  top_companies_shared: SharedCompanyInsight[]
  top_referents_by_visits: ReferentVisitInsight[]
  students_at_risk: StudentRiskInsight[]
  compliance_status: ComplianceCheck[]
}

export interface EnrichedAuditLog extends AuditLogRow {
  establishment_name: string | null
  user_name: string | null
}

export interface MonthlyTrends {
  placements_per_month: Array<{ month: string; count: number }>
  visits_per_month: Array<{ month: string; count: number }>
  new_companies_per_month: Array<{ month: string; count: number }>
}

export interface SuperadminEstablishmentDetail {
  establishment: EstablishmentRow
  settings: EstablishmentSettingsRow | null
  admins: ProfileRow[]
  classes: ClassRow[]
  recent_activity: EnrichedAuditLog[]
  kpis: {
    students: number
    placements: number
    placement_rate: number
    teachers: number
    companies: number
    tutors: number
    periods: number
    alerts: number
  }
}

export interface SystemHealth {
  generated_at: string
  cache_ttl_seconds: number
  tables: Array<{ name: string; rows: number; status: 'ok' | 'warning' }>
  checks: ComplianceCheck[]
}

interface AccessInput {
  accessToken: string
}

interface ActivityInput extends AccessInput {
  limit: number
  establishmentId: string | null
  action: string | null
}

interface EstablishmentInput extends AccessInput {
  establishmentId: string
}

interface SetActiveInput extends EstablishmentInput {
  active: boolean
}

interface Snapshot {
  establishments: EstablishmentRow[]
  students: StudentRow[]
  classes: ClassRow[]
  profiles: ProfileRow[]
  teachers: TeacherRow[]
  companies: CompanyRow[]
  tutors: TutorRow[]
  periods: PfmpPeriodRow[]
  placements: PlacementRow[]
  visits: VisitRow[]
  documents: DocumentRow[]
  alerts: AlertRow[]
  auditLogs: AuditLogRow[]
  settings: EstablishmentSettingsRow[]
}

const CACHE_TTL_MS = 60_000
const ACTIVE_PLACEMENT_STATUSES = new Set([
  'found',
  'confirmed',
  'pending_convention',
  'signed_convention',
  'in_progress',
  'completed',
])
const cache = new Map<string, { expiresAt: number; value: unknown }>()

export const getGlobalKpis = createServerFn({ method: 'POST' })
  .inputValidator(validateAccessInput)
  .handler(async ({ data }): Promise<GlobalKpis> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return readCache('global-kpis', async () => buildGlobalKpis(await getSnapshot(adminClient)))
    })
  })

export const getEstablishmentBreakdown = createServerFn({ method: 'POST' })
  .inputValidator(validateAccessInput)
  .handler(async ({ data }): Promise<EstablishmentBreakdownItem[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return readCache('establishment-breakdown', async () =>
        buildEstablishmentBreakdown(await getSnapshot(adminClient)),
      )
    })
  })

export const getCrossEstablishmentInsights = createServerFn({ method: 'POST' })
  .inputValidator(validateAccessInput)
  .handler(async ({ data }): Promise<CrossEstablishmentInsights> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return readCache('cross-insights', async () =>
        buildCrossInsights(await getSnapshot(adminClient)),
      )
    })
  })

export const getActivityFeed = createServerFn({ method: 'POST' })
  .inputValidator(validateActivityInput)
  .handler(async ({ data }): Promise<EnrichedAuditLog[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return loadActivityFeed(adminClient, data)
    })
  })

export const getMonthlyTrends = createServerFn({ method: 'POST' })
  .inputValidator(validateAccessInput)
  .handler(async ({ data }): Promise<MonthlyTrends> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return readCache('monthly-trends', async () => buildMonthlyTrends(await getSnapshot(adminClient)))
    })
  })

export const getSuperadminEstablishmentDetail = createServerFn({ method: 'POST' })
  .inputValidator(validateEstablishmentInput)
  .handler(async ({ data }): Promise<SuperadminEstablishmentDetail | null> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return buildEstablishmentDetail(await getSnapshot(adminClient), data.establishmentId)
    })
  })

export const setEstablishmentActive = createServerFn({ method: 'POST' })
  .inputValidator(validateSetActiveInput)
  .handler(async ({ data }): Promise<{ ok: true; active: boolean }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await assertSuperadmin(adminClient, data.accessToken)
      const establishment = await getEstablishment(adminClient, data.establishmentId)
      const { error } = await adminClient
        .from('establishments')
        .update({ active: data.active, updated_at: new Date().toISOString() })
        .eq('id', data.establishmentId)
      if (error) throw new Error(`Mise a jour etablissement impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: establishment.id,
        userId: caller.id,
        action: data.active ? 'superadmin.establishment.activated' : 'superadmin.establishment.deactivated',
        description: `${data.active ? 'Reactivation' : 'Desactivation'} de ${establishment.name}`,
        metadata: { establishment_id: establishment.id, source: 'server.superadminDashboard' },
      })
      clearSuperadminCache()
      return { ok: true, active: data.active }
    })
  })

export const startSuperadminImpersonation = createServerFn({ method: 'POST' })
  .inputValidator(validateEstablishmentInput)
  .handler(async ({ data }): Promise<{ ok: true; establishmentId: string; establishmentName: string; expiresAt: string; redirectTo: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await assertSuperadmin(adminClient, data.accessToken)
      const establishment = await getEstablishment(adminClient, data.establishmentId)
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      await insertAuditLog(adminClient, {
        establishmentId: establishment.id,
        userId: caller.id,
        action: 'superadmin.impersonation.started',
        description: `Contexte tenant ouvert par superadmin: ${establishment.name}`,
        metadata: {
          establishment_id: establishment.id,
          expires_at: expiresAt,
          mode: 'active_establishment_context',
          source: 'server.superadminDashboard',
        },
      })
      return {
        ok: true,
        establishmentId: establishment.id,
        establishmentName: establishment.name,
        expiresAt,
        redirectTo: '/admin/dashboard',
      }
    })
  })

export const getSystemHealth = createServerFn({ method: 'POST' })
  .inputValidator(validateAccessInput)
  .handler(async ({ data }): Promise<SystemHealth> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await assertSuperadmin(adminClient, data.accessToken)
      return readCache('system-health', async () => buildSystemHealth(await getSnapshot(adminClient)))
    })
  })

async function assertSuperadmin(adminClient: AdminClient, accessToken: string): Promise<ProfileRow> {
  const caller = await getCallerProfile(adminClient, accessToken)
  if (caller.role !== 'superadmin') {
    throw new Error('Acces refuse: cette fonction est reservee aux superadmins.')
  }
  return caller
}

async function getSnapshot(adminClient: AdminClient): Promise<Snapshot> {
  return readCache('snapshot', async () => loadSnapshot(adminClient))
}

async function loadSnapshot(adminClient: AdminClient): Promise<Snapshot> {
  const [
    establishmentsResult,
    studentsResult,
    classesResult,
    profilesResult,
    teachersResult,
    companiesResult,
    tutorsResult,
    periodsResult,
    placementsResult,
    visitsResult,
    documentsResult,
    alertsResult,
    auditLogsResult,
    settingsResult,
  ] = await Promise.all([
    adminClient.from('establishments').select('*').order('name'),
    adminClient.from('students').select('*'),
    adminClient.from('classes').select('*'),
    adminClient.from('profiles').select('*'),
    adminClient.from('teachers').select('*'),
    adminClient.from('companies').select('*'),
    adminClient.from('tutors').select('*'),
    adminClient.from('pfmp_periods').select('*'),
    adminClient.from('placements').select('*'),
    adminClient.from('visits').select('*'),
    adminClient.from('documents').select('*'),
    adminClient.from('alerts').select('*'),
    adminClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
    adminClient.from('establishment_settings').select('*'),
  ])

  throwSupabaseError('establishments', establishmentsResult.error)
  throwSupabaseError('students', studentsResult.error)
  throwSupabaseError('classes', classesResult.error)
  throwSupabaseError('profiles', profilesResult.error)
  throwSupabaseError('teachers', teachersResult.error)
  throwSupabaseError('companies', companiesResult.error)
  throwSupabaseError('tutors', tutorsResult.error)
  throwSupabaseError('pfmp_periods', periodsResult.error)
  throwSupabaseError('placements', placementsResult.error)
  throwSupabaseError('visits', visitsResult.error)
  throwSupabaseError('documents', documentsResult.error)
  throwSupabaseError('alerts', alertsResult.error)
  throwSupabaseError('audit_logs', auditLogsResult.error)
  throwSupabaseError('establishment_settings', settingsResult.error)

  return {
    establishments: (establishmentsResult.data as unknown as EstablishmentRow[]) ?? [],
    students: (studentsResult.data as unknown as StudentRow[]) ?? [],
    classes: (classesResult.data as unknown as ClassRow[]) ?? [],
    profiles: (profilesResult.data as unknown as ProfileRow[]) ?? [],
    teachers: (teachersResult.data as unknown as TeacherRow[]) ?? [],
    companies: (companiesResult.data as unknown as CompanyRow[]) ?? [],
    tutors: (tutorsResult.data as unknown as TutorRow[]) ?? [],
    periods: (periodsResult.data as unknown as PfmpPeriodRow[]) ?? [],
    placements: (placementsResult.data as unknown as PlacementRow[]) ?? [],
    visits: (visitsResult.data as unknown as VisitRow[]) ?? [],
    documents: (documentsResult.data as unknown as DocumentRow[]) ?? [],
    alerts: (alertsResult.data as unknown as AlertRow[]) ?? [],
    auditLogs: (auditLogsResult.data as unknown as AuditLogRow[]) ?? [],
    settings: (settingsResult.data as unknown as EstablishmentSettingsRow[]) ?? [],
  }
}

function buildGlobalKpis(snapshot: Snapshot): GlobalKpis {
  const students = activeStudents(snapshot.students)
  const placements = activePlacements(snapshot.placements)
  const placedStudentIds = new Set(placements.map((placement) => placement.student_id))
  const visitsDone = snapshot.visits.filter((visit) => visit.status === 'validated').length
  const companiesById = mapById(snapshot.companies)
  const volume = countBy(
    placements.filter((placement) => Boolean(placement.company_id)),
    (placement) => placement.company_id ?? '',
  )
  const topCompanies = [...volume.entries()]
    .map(([companyId, placementsCount]) => ({
      companyId,
      name: companiesById.get(companyId)?.name ?? 'Entreprise inconnue',
      placements: placementsCount,
    }))
    .sort((a, b) => b.placements - a.placements)
    .slice(0, 10)

  return {
    total_establishments: snapshot.establishments.length,
    total_students: students.length,
    total_placements_active: placements.length,
    placement_rate: percent(placedStudentIds.size, students.length),
    total_visits_planned: snapshot.visits.length,
    total_visits_done: visitsDone,
    top_companies_by_volume: topCompanies,
    alerts_count: snapshot.alerts.filter((alert) => !alert.resolved).length,
  }
}

function buildEstablishmentBreakdown(snapshot: Snapshot): EstablishmentBreakdownItem[] {
  const studentsByEst = groupBy(activeStudents(snapshot.students), (student) => student.establishment_id)
  const placementsByEst = groupBy(activePlacements(snapshot.placements), (placement) => placement.establishment_id)
  const classesByEst = groupBy(snapshot.classes, (klass) => klass.establishment_id)
  const companiesByEst = groupBy(activeCompanies(snapshot.companies), (company) => company.establishment_id)
  const teachersByEst = groupBy(activeTeachers(snapshot.teachers), (teacher) => teacher.establishment_id)
  const alertsByEst = groupBy(
    snapshot.alerts.filter((alert) => !alert.resolved),
    (alert) => alert.establishment_id,
  )
  const auditByEst = groupBy(
    snapshot.auditLogs.filter((log) => Boolean(log.establishment_id)),
    (log) => log.establishment_id ?? '',
  )
  const riskByEst = groupBy(buildStudentsAtRisk(snapshot), (risk) => risk.establishmentId)

  return snapshot.establishments.map((establishment) => {
    const students = studentsByEst.get(establishment.id) ?? []
    const placements = placementsByEst.get(establishment.id) ?? []
    const placed = new Set(placements.map((placement) => placement.student_id))
    const alerts = alertsByEst.get(establishment.id) ?? []
    const risk = riskByEst.get(establishment.id) ?? []
    return {
      establishment,
      students: students.length,
      placements: placements.length,
      placement_rate: percent(placed.size, students.length),
      pending_actions: alerts.length + risk.length,
      last_activity: latestDate((auditByEst.get(establishment.id) ?? []).map((log) => log.created_at)),
      classes: (classesByEst.get(establishment.id) ?? []).length,
      companies: (companiesByEst.get(establishment.id) ?? []).length,
      teachers: (teachersByEst.get(establishment.id) ?? []).length,
      alerts: alerts.length,
    }
  })
}

function buildCrossInsights(snapshot: Snapshot): CrossEstablishmentInsights {
  return {
    top_companies_shared: buildSharedCompanies(snapshot),
    top_referents_by_visits: buildTopReferents(snapshot),
    students_at_risk: buildStudentsAtRisk(snapshot).slice(0, 20),
    compliance_status: buildComplianceChecks(snapshot),
  }
}

async function loadActivityFeed(
  adminClient: AdminClient,
  input: ActivityInput,
): Promise<EnrichedAuditLog[]> {
  let query = adminClient
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(input.limit)

  if (input.establishmentId) query = query.eq('establishment_id', input.establishmentId)
  if (input.action) query = query.ilike('action', `%${input.action}%`)

  const { data, error } = await query
  if (error) throw new Error(`Lecture audit logs impossible: ${error.message}`)

  const logs = ((data as unknown as AuditLogRow[]) ?? [])
  const establishmentIds = unique(logs.map((log) => log.establishment_id))
  const userIds = unique(logs.map((log) => log.user_id))
  const [establishmentsResult, profilesResult] = await Promise.all([
    establishmentIds.length > 0
      ? adminClient.from('establishments').select('id,name').in('id', establishmentIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? adminClient.from('profiles').select('id,first_name,last_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (establishmentsResult.error) {
    throw new Error(`Lecture etablissements audit impossible: ${establishmentsResult.error.message}`)
  }
  if (profilesResult.error) {
    throw new Error(`Lecture profils audit impossible: ${profilesResult.error.message}`)
  }

  const establishmentNameById = new Map(
    ((establishmentsResult.data as Array<{ id: string; name: string }>) ?? []).map((row) => [
      row.id,
      row.name,
    ]),
  )
  const userNameById = new Map(
    ((profilesResult.data as Array<{ id: string; first_name: string; last_name: string }>) ?? []).map((row) => [
      row.id,
      `${row.first_name} ${row.last_name}`,
    ]),
  )

  return logs.map((log) => ({
    ...log,
    establishment_name: log.establishment_id ? establishmentNameById.get(log.establishment_id) ?? null : null,
    user_name: log.user_id ? userNameById.get(log.user_id) ?? null : null,
  }))
}

function buildMonthlyTrends(snapshot: Snapshot): MonthlyTrends {
  const months = lastMonths(12)
  const empty = () => months.map((month) => ({ month, count: 0 }))
  const placements = new Map(empty().map((entry) => [entry.month, entry.count]))
  const visits = new Map(empty().map((entry) => [entry.month, entry.count]))
  const companies = new Map(empty().map((entry) => [entry.month, entry.count]))

  for (const placement of snapshot.placements) incrementMonth(placements, placement.created_at)
  for (const visit of snapshot.visits) incrementMonth(visits, visit.date || visit.created_at)
  for (const company of snapshot.companies) incrementMonth(companies, company.created_at)

  return {
    placements_per_month: months.map((month) => ({ month, count: placements.get(month) ?? 0 })),
    visits_per_month: months.map((month) => ({ month, count: visits.get(month) ?? 0 })),
    new_companies_per_month: months.map((month) => ({ month, count: companies.get(month) ?? 0 })),
  }
}

function buildEstablishmentDetail(
  snapshot: Snapshot,
  establishmentId: string,
): SuperadminEstablishmentDetail | null {
  const establishment = snapshot.establishments.find((item) => item.id === establishmentId)
  if (!establishment) return null

  const students = activeStudents(snapshot.students).filter((student) => student.establishment_id === establishmentId)
  const placements = activePlacements(snapshot.placements).filter(
    (placement) => placement.establishment_id === establishmentId,
  )
  const admins = snapshot.profiles.filter(
    (profile) =>
      profile.establishment_id === establishmentId &&
      !profile.archived_at &&
      ['admin', 'ddfpt'].includes(profile.role),
  )
  const recentActivity = enrichLogs(snapshot, snapshot.auditLogs.filter((log) => log.establishment_id === establishmentId).slice(0, 20))
  return {
    establishment,
    settings: snapshot.settings.find((setting) => setting.establishment_id === establishmentId) ?? null,
    admins,
    classes: snapshot.classes.filter((klass) => klass.establishment_id === establishmentId),
    recent_activity: recentActivity,
    kpis: {
      students: students.length,
      placements: placements.length,
      placement_rate: percent(new Set(placements.map((placement) => placement.student_id)).size, students.length),
      teachers: activeTeachers(snapshot.teachers).filter((teacher) => teacher.establishment_id === establishmentId).length,
      companies: activeCompanies(snapshot.companies).filter((company) => company.establishment_id === establishmentId).length,
      tutors: activeTutors(snapshot.tutors).filter((tutor) => tutor.establishment_id === establishmentId).length,
      periods: snapshot.periods.filter((period) => period.establishment_id === establishmentId && !period.archived_at).length,
      alerts: snapshot.alerts.filter((alert) => alert.establishment_id === establishmentId && !alert.resolved).length,
    },
  }
}

function buildSystemHealth(snapshot: Snapshot): SystemHealth {
  const checks = buildComplianceChecks(snapshot)
  const tables = [
    { name: 'establishments', rows: snapshot.establishments.length },
    { name: 'profiles', rows: snapshot.profiles.length },
    { name: 'classes', rows: snapshot.classes.length },
    { name: 'students', rows: snapshot.students.length },
    { name: 'teachers', rows: snapshot.teachers.length },
    { name: 'companies', rows: snapshot.companies.length },
    { name: 'tutors', rows: snapshot.tutors.length },
    { name: 'pfmp_periods', rows: snapshot.periods.length },
    { name: 'placements', rows: snapshot.placements.length },
    { name: 'audit_logs_sample', rows: snapshot.auditLogs.length },
  ].map((table) => ({
    ...table,
    status: table.name === 'audit_logs_sample' && table.rows === 0 ? 'warning' as const : 'ok' as const,
  }))

  return {
    generated_at: new Date().toISOString(),
    cache_ttl_seconds: CACHE_TTL_MS / 1000,
    tables,
    checks,
  }
}

async function getEstablishment(adminClient: AdminClient, establishmentId: string): Promise<EstablishmentRow> {
  const { data, error } = await adminClient
    .from('establishments')
    .select('*')
    .eq('id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture etablissement impossible: ${error.message}`)
  if (!data) throw new Error('Etablissement introuvable.')
  return data as unknown as EstablishmentRow
}

function buildSharedCompanies(snapshot: Snapshot): SharedCompanyInsight[] {
  const establishmentsById = mapById(snapshot.establishments)
  const placementsByCompany = countBy(
    snapshot.placements.filter((placement) => Boolean(placement.company_id)),
    (placement) => placement.company_id ?? '',
  )
  const grouped = new Map<string, CompanyRow[]>()
  for (const company of activeCompanies(snapshot.companies)) {
    const key = normalizeCompanyName(company.name)
    if (!key) continue
    const rows = grouped.get(key) ?? []
    rows.push(company)
    grouped.set(key, rows)
  }
  return [...grouped.entries()]
    .map(([name, companies]) => {
      const establishmentIds = unique(companies.map((company) => company.establishment_id))
      return {
        name,
        cities: unique(companies.map((company) => company.city)),
        establishments: establishmentIds.map((id) => ({
          id,
          name: establishmentsById.get(id)?.name ?? 'Etablissement inconnu',
        })),
        placements: companies.reduce((sum, company) => sum + (placementsByCompany.get(company.id) ?? 0), 0),
      }
    })
    .filter((item) => item.establishments.length > 1)
    .sort((a, b) => b.establishments.length - a.establishments.length || b.placements - a.placements)
    .slice(0, 10)
}

function buildTopReferents(snapshot: Snapshot): ReferentVisitInsight[] {
  const profilesById = mapById(snapshot.profiles)
  const establishmentsById = mapById(snapshot.establishments)
  const visitsByTeacher = countBy(
    snapshot.visits.filter((visit) => Boolean(visit.teacher_id)),
    (visit) => visit.teacher_id ?? '',
  )
  return [...visitsByTeacher.entries()]
    .map(([profileId, visits]) => {
      const profile = profilesById.get(profileId)
      return {
        profileId,
        name: profile ? `${profile.first_name} ${profile.last_name}` : 'Referent inconnu',
        establishmentName: profile?.establishment_id
          ? establishmentsById.get(profile.establishment_id)?.name ?? 'Etablissement inconnu'
          : 'Etablissement inconnu',
        visits,
      }
    })
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10)
}

function buildStudentsAtRisk(snapshot: Snapshot): StudentRiskInsight[] {
  const today = startOfDay(new Date())
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 10)
  const establishmentsById = mapById(snapshot.establishments)
  const classesById = mapById(snapshot.classes)
  const placementsByStudentPeriod = new Set(
    activePlacements(snapshot.placements).map((placement) => `${placement.student_id}:${placement.period_id}`),
  )
  const upcomingPeriods = snapshot.periods.filter((period) => {
    if (period.archived_at || !period.class_id) return false
    const start = startOfDay(new Date(period.start_date))
    return start >= today && start <= horizon && period.status !== 'cancelled' && period.status !== 'archived'
  })
  const studentsByClass = groupBy(activeStudents(snapshot.students), (student) => student.class_id ?? '')
  const risks: StudentRiskInsight[] = []

  for (const period of upcomingPeriods) {
    const students = studentsByClass.get(period.class_id ?? '') ?? []
    const klass = period.class_id ? classesById.get(period.class_id) ?? null : null
    for (const student of students) {
      if (placementsByStudentPeriod.has(`${student.id}:${period.id}`)) continue
      risks.push({
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        className: klass?.name ?? null,
        establishmentId: student.establishment_id,
        establishmentName: establishmentsById.get(student.establishment_id)?.name ?? 'Etablissement inconnu',
        periodId: period.id,
        periodName: period.name,
        startsAt: period.start_date,
        daysBeforeStart: Math.max(0, Math.ceil((new Date(period.start_date).getTime() - today.getTime()) / 86_400_000)),
      })
    }
  }
  return risks.sort((a, b) => a.daysBeforeStart - b.daysBeforeStart)
}

function buildComplianceChecks(snapshot: Snapshot): ComplianceCheck[] {
  const activeEstablishments = snapshot.establishments.filter((establishment) => establishment.active)
  const establishmentsWithAdmins = new Set(
    snapshot.profiles
      .filter((profile) => !profile.archived_at && ['admin', 'ddfpt'].includes(profile.role) && profile.establishment_id)
      .map((profile) => profile.establishment_id ?? ''),
  )
  const withoutAdmins = activeEstablishments.filter((establishment) => !establishmentsWithAdmins.has(establishment.id))
  const withoutAudit = snapshot.auditLogs.length === 0
  const unverifiedDomains = activeEstablishments.filter(
    (establishment) => establishment.custom_domain && !establishment.domain_verified,
  )
  const activeWithoutStudents = activeEstablishments.filter(
    (establishment) => !snapshot.students.some((student) => student.establishment_id === establishment.id && !student.archived_at),
  )
  return [
    {
      key: 'tenant_admins',
      label: 'Admins etablissements',
      status: withoutAdmins.length === 0 ? 'ok' : 'warning',
      detail:
        withoutAdmins.length === 0
          ? 'Chaque etablissement actif a au moins un admin ou DDFPT.'
          : `${withoutAdmins.length} etablissement(s) actif(s) sans admin/DDFPT.`,
    },
    {
      key: 'audit_logs',
      label: 'Audit logs',
      status: withoutAudit ? 'danger' : 'ok',
      detail: withoutAudit ? "Aucun audit log recent dans l'echantillon." : 'Journalisation disponible.',
    },
    {
      key: 'domains',
      label: 'Domaines personnalises',
      status: unverifiedDomains.length === 0 ? 'ok' : 'warning',
      detail:
        unverifiedDomains.length === 0
          ? 'Aucun domaine actif non verifie.'
          : `${unverifiedDomains.length} domaine(s) actif(s) a verifier.`,
    },
    {
      key: 'student_data',
      label: 'Donnees eleves',
      status: activeWithoutStudents.length === 0 ? 'ok' : 'warning',
      detail:
        activeWithoutStudents.length === 0
          ? 'Tous les etablissements actifs ont des eleves ou sont prets.'
          : `${activeWithoutStudents.length} etablissement(s) actif(s) sans eleves importes.`,
    },
  ]
}

function enrichLogs(snapshot: Snapshot, logs: AuditLogRow[]): EnrichedAuditLog[] {
  const establishmentsById = mapById(snapshot.establishments)
  const profilesById = mapById(snapshot.profiles)
  return logs.map((log) => {
    const profile = log.user_id ? profilesById.get(log.user_id) ?? null : null
    return {
      ...log,
      establishment_name: log.establishment_id ? establishmentsById.get(log.establishment_id)?.name ?? null : null,
      user_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
    }
  })
}

function validateAccessInput(data: unknown): AccessInput {
  if (!isRecord(data)) throw new Error('Payload invalide.')
  const accessToken = clean(data.accessToken)
  if (!accessToken) throw new Error('Session manquante.')
  return { accessToken }
}

function validateActivityInput(data: unknown): ActivityInput {
  const base = validateAccessInput(data)
  const record = data as Record<string, unknown>
  const limit = Math.max(1, Math.min(200, Number(record.limit ?? 50)))
  const establishmentId = clean(record.establishmentId)
  const action = clean(record.action)
  return {
    ...base,
    limit,
    establishmentId: establishmentId ? validateUuid(establishmentId, 'Etablissement') : null,
    action: action || null,
  }
}

function validateEstablishmentInput(data: unknown): EstablishmentInput {
  const base = validateAccessInput(data)
  const record = data as Record<string, unknown>
  return {
    ...base,
    establishmentId: validateUuid(record.establishmentId, 'Etablissement'),
  }
}

function validateSetActiveInput(data: unknown): SetActiveInput {
  const base = validateEstablishmentInput(data)
  const record = data as Record<string, unknown>
  if (typeof record.active !== 'boolean') throw new Error('Statut actif invalide.')
  return { ...base, active: record.active }
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null
}

function throwSupabaseError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`Lecture ${label} impossible: ${error.message}`)
}

async function readCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value as T
  const value = await loader()
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

function clearSuperadminCache(): void {
  cache.clear()
}

function activeStudents(students: StudentRow[]): StudentRow[] {
  return students.filter((student) => !student.archived_at)
}

function activeTeachers(teachers: TeacherRow[]): TeacherRow[] {
  return teachers.filter((teacher) => !teacher.archived_at)
}

function activeCompanies(companies: CompanyRow[]): CompanyRow[] {
  return companies.filter((company) => !company.archived_at)
}

function activeTutors(tutors: TutorRow[]): TutorRow[] {
  return tutors.filter((tutor) => !tutor.archived_at)
}

function activePlacements(placements: PlacementRow[]): PlacementRow[] {
  return placements.filter(
    (placement) => !placement.archived_at && ACTIVE_PLACEMENT_STATUSES.has(placement.status),
  )
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
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

function countBy<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    if (!k) continue
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return map
}

function mapById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  return sorted[0] ?? null
}

function normalizeCompanyName(value: string): string {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(sarl|sas|sa|eurl|ets|garage|auto)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function lastMonths(count: number): string[] {
  const now = new Date()
  const months: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(monthKey(date))
  }
  return months
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function incrementMonth(map: Map<string, number>, value: string | null | undefined): void {
  if (!value) return
  const key = monthKey(new Date(value))
  if (!map.has(key)) return
  map.set(key, (map.get(key) ?? 0) + 1)
}
