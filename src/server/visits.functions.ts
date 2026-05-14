import { createServerFn } from '@tanstack/react-start'
import type {
  ClassRow,
  CompanyRow,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StudentRow,
  TeacherRow,
  TutorRow,
  UserRole,
  VisitEvaluationLevel,
  VisitEvaluationRole,
  VisitEvaluationRow,
  VisitPhoto,
  VisitRow,
  VisitStatus,
  VisitType,
} from '@/lib/database.types'
import { optimizeTour, type TourVisit } from '@/lib/geolocation'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

export interface FieldVisitWithRelations {
  visit: VisitRow
  placement: PlacementRow | null
  student: StudentRow | null
  class: ClassRow | null
  period: PfmpPeriodRow | null
  company: CompanyRow | null
  tutor: TutorRow | null
  referent: TeacherRow | null
  evaluations: VisitEvaluationRow[]
}

export interface VisitReportInput {
  summary: string | null
  fullReport: string | null
  voiceTranscript: string | null
  studentSatisfaction: number | null
  tutorSatisfaction: number | null
  photos: VisitPhoto[]
}

export interface TourSuggestion {
  route: FieldVisitWithRelations[]
  totalDistanceKm: number
  estimatedDurationMinutes: number
  directionsUrl: string
}

const READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'referent', 'superadmin']
const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const VISIT_TYPES: VisitType[] = ['mi_parcours', 'fin_stage', 'urgence', 'autre']
const VISIT_STATUSES: VisitStatus[] = ['planned', 'in_progress', 'completed', 'cancelled', 'no_show', 'draft', 'validated', 'archived']
const EVALUATION_LEVELS: VisitEvaluationLevel[] = ['non_evalue', 'A', 'B', 'C', 'NE']

export const listVisitsForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadVisits(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)
      let query = adminClient
        .from('visits')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('date', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      if (data.dateFrom) query = query.gte('scheduled_at', data.dateFrom)
      if (data.dateTo) query = query.lte('scheduled_at', data.dateTo)
      if (data.status) query = query.eq('status', data.status)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture visites impossible: ${error.message}`)
      return enrichVisits(adminClient, caller, (rows as unknown as VisitRow[]) ?? [])
    })
  })

export const listVisitsForReferent = createServerFn({ method: 'POST' })
  .inputValidator(validateListForReferentInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadVisits(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)
      const referentId = data.referentId ?? caller.id
      if (caller.role === 'referent' && referentId !== caller.id) {
        throw new Error('Acces refuse: un referent ne consulte que ses propres visites.')
      }

      let query = adminClient
        .from('visits')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('referent_id', referentId)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('date', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      if (data.dateFrom) query = query.gte('scheduled_at', data.dateFrom)
      if (data.dateTo) query = query.lte('scheduled_at', data.dateTo)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture visites referent impossible: ${error.message}`)
      return enrichVisits(adminClient, caller, (rows as unknown as VisitRow[]) ?? [])
    })
  })

export const listVisitsForPlacement = createServerFn({ method: 'POST' })
  .inputValidator(validateListForPlacementInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      assertSameTenant(caller, placement.establishment_id, data.establishmentId)
      const { data: rows, error } = await adminClient
        .from('visits')
        .select('*')
        .eq('placement_id', placement.id)
        .order('scheduled_at', { ascending: false, nullsFirst: false })
      if (error) throw new Error(`Lecture historique visites impossible: ${error.message}`)
      const enriched = await enrichVisits(adminClient, caller, (rows as unknown as VisitRow[]) ?? [])
      return enriched.filter((row) => canReadVisit(caller, row))
    })
  })

export const getVisitDetail = createServerFn({ method: 'POST' })
  .inputValidator(validateVisitDetailInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations | null> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      if (data.establishmentId) assertSameTenant(caller, visit.establishment_id, data.establishmentId)
      const [enriched] = await enrichVisits(adminClient, caller, [visit])
      return enriched ?? null
    })
  })

export const planVisit = createServerFn({ method: 'POST' })
  .inputValidator(validatePlanVisitInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      const student = await getStudentById(adminClient, placement.student_id)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanPlanVisit(caller, student, klass, data.establishmentId)
      const referent = data.referentId ? await getTeacherByProfileOrTeacherId(adminClient, placement.establishment_id, data.referentId) : await getReferentForPlacement(adminClient, placement)
      const visit = await insertVisit(adminClient, placement, student, referent, data)
      await insertAuditLog(adminClient, {
        establishmentId: visit.establishment_id,
        userId: caller.id,
        action: 'visit.planned',
        description: `Visite planifiee pour ${student.first_name} ${student.last_name}`,
        metadata: { visit_id: visit.id, placement_id: placement.id, scheduled_at: data.scheduledAt },
      })
      const [enriched] = await enrichVisits(adminClient, caller, [visit])
      return enriched
    })
  })

export const startVisit = createServerFn({ method: 'POST' })
  .inputValidator(validateStartVisitInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
      assertCanMutateVisit(caller, enriched, 'demarrer')
      const updated = await updateVisitPatch(adminClient, visit.id, {
        status: 'in_progress',
        location_lat: data.locationLat,
        location_lng: data.locationLng,
        updated_at: new Date().toISOString(),
      })
      await insertAuditLog(adminClient, {
        establishmentId: updated.establishment_id,
        userId: caller.id,
        action: 'visit.started',
        description: 'Visite terrain demarree',
        metadata: { visit_id: updated.id, location_lat: data.locationLat, location_lng: data.locationLng },
      })
      return (await enrichVisits(adminClient, caller, [updated]))[0]
    })
  })

export const updateVisitReport = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateReportInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
      assertCanMutateVisit(caller, enriched, 'modifier')
      const updated = await updateVisitPatch(adminClient, visit.id, {
        summary: data.report.summary,
        full_report: data.report.fullReport,
        voice_transcript: data.report.voiceTranscript,
        student_satisfaction: data.report.studentSatisfaction,
        tutor_satisfaction: data.report.tutorSatisfaction,
        photos: data.report.photos,
        updated_at: new Date().toISOString(),
      })
      await insertAuditLog(adminClient, {
        establishmentId: updated.establishment_id,
        userId: caller.id,
        action: 'visit.report_updated',
        description: 'Compte-rendu de visite mis a jour',
        metadata: { visit_id: updated.id, photos: data.report.photos.length },
      })
      return (await enrichVisits(adminClient, caller, [updated]))[0]
    })
  })

export const completeVisit = createServerFn({ method: 'POST' })
  .inputValidator(validateVisitMutationInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
      assertCanMutateVisit(caller, enriched, 'terminer')
      const doneAt = new Date()
      const startedAt = visit.status === 'in_progress' ? new Date(visit.updated_at) : visit.scheduled_at ? new Date(visit.scheduled_at) : doneAt
      const duration = Math.max(0, Math.round((doneAt.getTime() - startedAt.getTime()) / 60000))
      const updated = await updateVisitPatch(adminClient, visit.id, {
        status: 'completed',
        done_at: doneAt.toISOString(),
        duration_minutes: duration,
        updated_at: doneAt.toISOString(),
      })
      await insertAuditLog(adminClient, {
        establishmentId: updated.establishment_id,
        userId: caller.id,
        action: 'visit.completed',
        description: 'Visite terrain terminee',
        metadata: { visit_id: updated.id, duration_minutes: duration },
      })
      return (await enrichVisits(adminClient, caller, [updated]))[0]
    })
  })

export const flagVisitForReview = createServerFn({ method: 'POST' })
  .inputValidator(validateFlagVisitInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
      assertCanMutateVisit(caller, enriched, 'signaler')
      const updated = await updateVisitPatch(adminClient, visit.id, {
        flagged_for_review: true,
        flag_reason: data.reason,
        alert_level: 'problem',
        updated_at: new Date().toISOString(),
      })
      await insertAuditLog(adminClient, {
        establishmentId: updated.establishment_id,
        userId: caller.id,
        action: 'visit.flagged',
        description: 'Visite signalee pour revue',
        metadata: { visit_id: updated.id, reason: data.reason },
      })
      return (await enrichVisits(adminClient, caller, [updated]))[0]
    })
  })

export const cancelVisit = createServerFn({ method: 'POST' })
  .inputValidator(validateFlagVisitInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => updateVisitStatusWithReason(data, 'cancelled', 'visit.cancelled'))

export const markNoShow = createServerFn({ method: 'POST' })
  .inputValidator(validateFlagVisitInput)
  .handler(async ({ data }): Promise<FieldVisitWithRelations> => updateVisitStatusWithReason(data, 'no_show', 'visit.no_show'))

export const addVisitEvaluation = createServerFn({ method: 'POST' })
  .inputValidator(validateEvaluationInput)
  .handler(async ({ data }): Promise<VisitEvaluationRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const visit = await getVisitById(adminClient, data.visitId)
      const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
      assertCanMutateVisit(caller, enriched, 'evaluer')
      const { data: row, error } = await adminClient
        .from('visit_evaluations')
        .insert({
          visit_id: visit.id,
          competence_code: data.competenceCode,
          competence_label: data.competenceLabel,
          level: data.level,
          notes: data.notes,
          evaluated_by_role: data.evaluatedByRole,
        })
        .select('*')
        .single()
      if (error) throw new Error(`Evaluation visite impossible: ${error.message}`)
      await insertAuditLog(adminClient, {
        establishmentId: visit.establishment_id,
        userId: caller.id,
        action: 'visit.evaluation_added',
        description: 'Competence evaluee pendant une visite',
        metadata: { visit_id: visit.id, competence_code: data.competenceCode, level: data.level },
      })
      return row as unknown as VisitEvaluationRow
    })
  })

export const getReferentTourSuggestion = createServerFn({ method: 'POST' })
  .inputValidator(validateTourInput)
  .handler(async ({ data }): Promise<TourSuggestion> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const dayStart = `${data.date}T00:00:00.000Z`
      const dayEnd = `${data.date}T23:59:59.999Z`
      const visits = await listVisitsForReferent({
        data: {
          accessToken: data.accessToken,
          establishmentId: data.establishmentId,
          referentId: data.referentId ?? caller.id,
          dateFrom: dayStart,
          dateTo: dayEnd,
        },
      })
      const tourVisits: TourVisit[] = visits.map((item) => ({
        id: item.visit.id,
        label: item.company?.name ?? item.student ? `${item.student?.first_name ?? ''} ${item.student?.last_name ?? ''}`.trim() : 'Visite',
        address: item.company?.address ?? null,
        city: item.company?.city ?? null,
        lat: null,
        lng: null,
      }))
      const optimized = optimizeTour(tourVisits)
      const byId = new Map(visits.map((item) => [item.visit.id, item]))
      const ordered = optimized.route.map((visit) => byId.get(visit.id)).filter(Boolean) as FieldVisitWithRelations[]
      return {
        route: ordered,
        totalDistanceKm: optimized.totalDistanceKm,
        estimatedDurationMinutes: optimized.estimatedDurationMinutes,
        directionsUrl: buildDirectionsUrl(optimized.route),
      }
    })
  })

async function updateVisitStatusWithReason(
  data: { accessToken: string; visitId: string; reason: string },
  status: VisitStatus,
  action: string,
): Promise<FieldVisitWithRelations> {
  return safeHandlerCall(async () => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const visit = await getVisitById(adminClient, data.visitId)
    const enriched = (await enrichVisits(adminClient, caller, [visit]))[0]
    assertCanMutateVisit(caller, enriched, 'changer le statut')
    const updated = await updateVisitPatch(adminClient, visit.id, {
      status,
      flag_reason: data.reason,
      updated_at: new Date().toISOString(),
    })
    await insertAuditLog(adminClient, {
      establishmentId: updated.establishment_id,
      userId: caller.id,
      action,
      description: `Statut visite: ${status}`,
      metadata: { visit_id: updated.id, reason: data.reason },
    })
    return (await enrichVisits(adminClient, caller, [updated]))[0]
  })
}

async function enrichVisits(adminClient: AdminClient, caller: ProfileRow, visits: VisitRow[]): Promise<FieldVisitWithRelations[]> {
  if (visits.length === 0) return []
  const placementIds = unique(visits.map((visit) => visit.placement_id))
  const studentIds = unique(visits.map((visit) => visit.student_id))
  const teacherIds = unique(visits.map((visit) => visit.teacher_id))
  const periodIds = unique(visits.map((visit) => visit.period_id))

  const [placements, students, teachers, periods, evaluations] = await Promise.all([
    selectByIds<PlacementRow>(adminClient, 'placements', placementIds),
    selectByIds<StudentRow>(adminClient, 'students', studentIds),
    selectByIds<TeacherRow>(adminClient, 'teachers', teacherIds),
    selectByIds<PfmpPeriodRow>(adminClient, 'pfmp_periods', periodIds),
    selectVisitEvaluations(adminClient, visits.map((visit) => visit.id)),
  ])

  const classIds = unique(students.map((student) => student.class_id))
  const companyIds = unique(placements.map((placement) => placement.company_id))
  const tutorIds = unique(placements.map((placement) => placement.tutor_id))
  const classes = await selectByIds<ClassRow>(adminClient, 'classes', classIds)
  const companies = await selectByIds<CompanyRow>(adminClient, 'companies', companyIds)
  const tutors = await selectByIds<TutorRow>(adminClient, 'tutors', tutorIds)

  const placementsById = byId(placements)
  const studentsById = byId(students)
  const teachersById = byId(teachers)
  const periodsById = byId(periods)
  const classesById = byId(classes)
  const companiesById = byId(companies)
  const tutorsById = byId(tutors)
  const evaluationsByVisit = groupEvaluations(evaluations)

  return visits
    .map((visit) => {
      const placement = visit.placement_id ? placementsById.get(visit.placement_id) ?? null : null
      const student = studentsById.get(visit.student_id) ?? null
      const klass = student?.class_id ? classesById.get(student.class_id) ?? null : null
      return {
        visit,
        placement,
        student,
        class: klass,
        period: visit.period_id ? periodsById.get(visit.period_id) ?? null : null,
        company: placement?.company_id ? companiesById.get(placement.company_id) ?? null : null,
        tutor: placement?.tutor_id ? tutorsById.get(placement.tutor_id) ?? null : null,
        referent: visit.teacher_id ? teachersById.get(visit.teacher_id) ?? null : null,
        evaluations: evaluationsByVisit.get(visit.id) ?? [],
      }
    })
    .filter((row) => canReadVisit(caller, row))
}

async function insertVisit(
  adminClient: AdminClient,
  placement: PlacementRow,
  student: StudentRow,
  referent: TeacherRow | null,
  input: PlanVisitInput,
): Promise<VisitRow> {
  const { data, error } = await adminClient
    .from('visits')
    .insert({
      establishment_id: placement.establishment_id,
      student_id: student.id,
      teacher_id: referent?.id ?? null,
      referent_id: referent?.profile_id ?? null,
      period_id: placement.period_id,
      placement_id: placement.id,
      date: input.scheduledAt.slice(0, 10),
      scheduled_at: input.scheduledAt,
      contact_type: 'visit',
      type: input.type,
      status: 'planned',
      alert_level: 'none',
    })
    .select('*')
    .single()
  if (error) throw new Error(`Planification visite impossible: ${error.message}`)
  return data as unknown as VisitRow
}

async function updateVisitPatch(adminClient: AdminClient, visitId: string, patch: Record<string, unknown>): Promise<VisitRow> {
  const { data, error } = await adminClient.from('visits').update(patch).eq('id', visitId).select('*').single()
  if (error) throw new Error(`Mise a jour visite impossible: ${error.message}`)
  return data as unknown as VisitRow
}

async function selectByIds<T>(adminClient: AdminClient, table: string, ids: string[]): Promise<T[]> {
  if (ids.length === 0) return []
  const { data, error } = await adminClient.from(table).select('*').in('id', ids)
  if (error) throw new Error(`Lecture ${table} impossible: ${error.message}`)
  return (data as unknown as T[]) ?? []
}

async function selectVisitEvaluations(adminClient: AdminClient, visitIds: string[]): Promise<VisitEvaluationRow[]> {
  if (visitIds.length === 0) return []
  const { data, error } = await adminClient
    .from('visit_evaluations')
    .select('*')
    .in('visit_id', visitIds)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Lecture evaluations visites impossible: ${error.message}`)
  return (data as unknown as VisitEvaluationRow[]) ?? []
}

async function getPlacementById(adminClient: AdminClient, placementId: string): Promise<PlacementRow> {
  const { data, error } = await adminClient.from('placements').select('*').eq('id', placementId).maybeSingle()
  if (error) throw new Error(`Lecture placement impossible: ${error.message}`)
  if (!data) throw new Error('Placement introuvable.')
  return data as unknown as PlacementRow
}

async function getVisitById(adminClient: AdminClient, visitId: string): Promise<VisitRow> {
  const { data, error } = await adminClient.from('visits').select('*').eq('id', visitId).maybeSingle()
  if (error) throw new Error(`Lecture visite impossible: ${error.message}`)
  if (!data) throw new Error('Visite introuvable.')
  return data as unknown as VisitRow
}

async function getStudentById(adminClient: AdminClient, studentId: string): Promise<StudentRow> {
  const { data, error } = await adminClient.from('students').select('*').eq('id', studentId).maybeSingle()
  if (error) throw new Error(`Lecture eleve impossible: ${error.message}`)
  if (!data) throw new Error('Eleve introuvable.')
  return data as unknown as StudentRow
}

async function getClassById(adminClient: AdminClient, classId: string): Promise<ClassRow> {
  const { data, error } = await adminClient.from('classes').select('*').eq('id', classId).maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  if (!data) throw new Error('Classe introuvable.')
  return data as unknown as ClassRow
}

async function getReferentForPlacement(adminClient: AdminClient, placement: PlacementRow): Promise<TeacherRow | null> {
  if (!placement.referent_id) return null
  return getTeacherByProfileOrTeacherId(adminClient, placement.establishment_id, placement.referent_id)
}

async function getTeacherByProfileOrTeacherId(adminClient: AdminClient, establishmentId: string, id: string): Promise<TeacherRow> {
  const { data, error } = await adminClient
    .from('teachers')
    .select('*')
    .eq('establishment_id', establishmentId)
    .or(`id.eq.${id},profile_id.eq.${id}`)
    .maybeSingle()
  if (error) throw new Error(`Lecture referent impossible: ${error.message}`)
  if (!data) throw new Error('Referent introuvable dans l annuaire.')
  return data as unknown as TeacherRow
}

function assertCanReadVisits(caller: ProfileRow): void {
  if (!READ_ROLES.includes(caller.role)) throw new Error('Acces refuse: lecture visites non autorisee.')
}

function assertCanPlanVisit(caller: ProfileRow, student: StudentRow, klass: ClassRow | null, requested?: string | null): void {
  if (MANAGE_ROLES.includes(caller.role)) {
    assertSameTenant(caller, student.establishment_id, requested)
    return
  }
  if (caller.role === 'principal' && caller.establishment_id === student.establishment_id && klass?.principal_id === caller.id) return
  if (caller.role === 'referent' && caller.establishment_id === student.establishment_id && student.referent_id === caller.id) return
  throw new Error('Acces refuse: planification visite non autorisee.')
}

function assertCanMutateVisit(caller: ProfileRow, item: FieldVisitWithRelations, action: string): void {
  if (MANAGE_ROLES.includes(caller.role)) {
    if (caller.role !== 'superadmin' && caller.establishment_id !== item.visit.establishment_id) throw new Error('Acces refuse: visite hors tenant.')
    return
  }
  if (caller.role === 'referent' && item.visit.referent_id === caller.id) return
  if (caller.role === 'principal' && item.class?.principal_id === caller.id) return
  throw new Error(`Acces refuse: vous ne pouvez pas ${action} cette visite.`)
}

function canReadVisit(caller: ProfileRow, item: FieldVisitWithRelations): boolean {
  if (caller.role === 'superadmin') return true
  if (caller.establishment_id !== item.visit.establishment_id) return false
  if (caller.role === 'admin' || caller.role === 'ddfpt') return true
  if (caller.role === 'principal' && item.class?.principal_id === caller.id) return true
  if (caller.role === 'referent' && (item.visit.referent_id === caller.id || item.student?.referent_id === caller.id)) return true
  return false
}

function resolveEstablishmentId(caller: ProfileRow, requested?: string | null): string {
  if (caller.role === 'superadmin') {
    if (!requested) throw new Error('Selectionnez un etablissement avant cette action superadmin.')
    return requested
  }
  if (!caller.establishment_id) throw new Error('Profil sans etablissement rattache.')
  if (requested && requested !== caller.establishment_id) throw new Error('Acces refuse: etablissement non autorise.')
  return caller.establishment_id
}

function assertSameTenant(caller: ProfileRow, targetEstablishmentId: string, requested?: string | null): void {
  const allowed = resolveEstablishmentId(caller, requested)
  if (allowed !== targetEstablishmentId) throw new Error('Acces refuse: ressource hors tenant.')
}

function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function groupEvaluations(rows: VisitEvaluationRow[]): Map<string, VisitEvaluationRow[]> {
  const grouped = new Map<string, VisitEvaluationRow[]>()
  for (const row of rows) {
    const list = grouped.get(row.visit_id) ?? []
    list.push(row)
    grouped.set(row.visit_id, list)
  }
  return grouped
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}

function buildDirectionsUrl(visits: TourVisit[]): string {
  const destination = visits.at(-1)
  const destinationText = destination ? destination.address ?? destination.city ?? destination.label : ''
  const waypoints = visits.slice(0, -1).map((visit) => visit.address ?? visit.city ?? visit.label).join('|')
  const params = new URLSearchParams({ destination: destinationText, travelmode: 'driving' })
  if (waypoints) params.set('waypoints', waypoints)
  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`
}

interface ListInput {
  accessToken: string
  establishmentId: string | null
  includeArchived: boolean
  dateFrom: string | null
  dateTo: string | null
  status: VisitStatus | null
}

interface PlanVisitInput {
  accessToken: string
  establishmentId: string | null
  placementId: string
  referentId: string | null
  scheduledAt: string
  type: VisitType
}

function validateListInput(data: unknown): ListInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
    dateFrom: optionalDateTime(record.dateFrom, 'Date debut'),
    dateTo: optionalDateTime(record.dateTo, 'Date fin'),
    status: optionalVisitStatus(record.status),
  }
}

function validateListForReferentInput(data: unknown): ListInput & { referentId: string | null } {
  const record = asRecord(data)
  return {
    ...validateListInput(data),
    referentId: optionalUuid(record.referentId, 'Referent'),
  }
}

function validateListForPlacementInput(data: unknown): { accessToken: string; establishmentId: string | null; placementId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    placementId: validateUuid(record.placementId, 'Placement'),
  }
}

function validatePlanVisitInput(data: unknown): PlanVisitInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    placementId: validateUuid(record.placementId, 'Placement'),
    referentId: optionalUuid(record.referentId, 'Referent'),
    scheduledAt: requiredDateTime(record.scheduledAt, 'Date de visite'),
    type: parseVisitType(record.type),
  }
}

function validateStartVisitInput(data: unknown): { accessToken: string; visitId: string; locationLat: number | null; locationLng: number | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    visitId: validateUuid(record.visitId, 'Visite'),
    locationLat: optionalNumber(record.locationLat),
    locationLng: optionalNumber(record.locationLng),
  }
}

function validateVisitMutationInput(data: unknown): { accessToken: string; visitId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    visitId: validateUuid(record.visitId, 'Visite'),
  }
}

function validateVisitDetailInput(data: unknown): { accessToken: string; establishmentId: string | null; visitId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    visitId: validateUuid(record.visitId, 'Visite'),
  }
}

function validateFlagVisitInput(data: unknown): { accessToken: string; visitId: string; reason: string } {
  const record = asRecord(data)
  return {
    ...validateVisitMutationInput(data),
    reason: requiredString(record.reason, 'Motif').slice(0, 500),
  }
}

function validateUpdateReportInput(data: unknown): { accessToken: string; visitId: string; report: VisitReportInput } {
  const record = asRecord(data)
  const report = asRecord(record.report)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    visitId: validateUuid(record.visitId, 'Visite'),
    report: {
      summary: optionalLongText(report.summary, 500),
      fullReport: optionalLongText(report.fullReport, 10000),
      voiceTranscript: optionalLongText(report.voiceTranscript, 15000),
      studentSatisfaction: optionalSatisfaction(report.studentSatisfaction),
      tutorSatisfaction: optionalSatisfaction(report.tutorSatisfaction),
      photos: parsePhotos(report.photos),
    },
  }
}

function validateEvaluationInput(data: unknown): {
  accessToken: string
  visitId: string
  competenceCode: string
  competenceLabel: string
  level: VisitEvaluationLevel
  notes: string | null
  evaluatedByRole: VisitEvaluationRole
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    visitId: validateUuid(record.visitId, 'Visite'),
    competenceCode: requiredString(record.competenceCode, 'Code competence').slice(0, 80),
    competenceLabel: requiredString(record.competenceLabel, 'Libelle competence').slice(0, 240),
    level: parseEvaluationLevel(record.level),
    notes: optionalLongText(record.notes, 1000),
    evaluatedByRole: parseEvaluationRole(record.evaluatedByRole),
  }
}

function validateTourInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  referentId: string | null
  date: string
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    referentId: optionalUuid(record.referentId, 'Referent'),
    date: requiredDate(record.date, 'Date tournee'),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload invalide.')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} obligatoire.`)
  return text
}

function optionalUuid(value: unknown, label: string): string | null {
  if (value == null || value === '') return null
  return validateUuid(value, label)
}

function requiredDateTime(value: unknown, label: string): string {
  const text = requiredString(value, label)
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} invalide.`)
  return date.toISOString()
}

function optionalDateTime(value: unknown, label: string): string | null {
  if (value == null || value === '') return null
  return requiredDateTime(value, label)
}

function requiredDate(value: unknown, label: string): string {
  const text = requiredString(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} invalide.`)
  return text
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function optionalSatisfaction(value: unknown): number | null {
  const parsed = optionalNumber(value)
  if (parsed == null) return null
  if (parsed < 1 || parsed > 5) throw new Error('Satisfaction invalide.')
  return Math.round(parsed)
}

function optionalLongText(value: unknown, maxLength: number): string | null {
  const text = clean(value)
  return text ? text.slice(0, maxLength) : null
}

function parseVisitType(value: unknown): VisitType {
  const text = clean(value) as VisitType
  if (!VISIT_TYPES.includes(text)) return 'mi_parcours'
  return text
}

function optionalVisitStatus(value: unknown): VisitStatus | null {
  if (value == null || value === '') return null
  const text = clean(value) as VisitStatus
  if (!VISIT_STATUSES.includes(text)) throw new Error('Statut visite invalide.')
  return text
}

function parseEvaluationLevel(value: unknown): VisitEvaluationLevel {
  const text = clean(value) as VisitEvaluationLevel
  if (!EVALUATION_LEVELS.includes(text)) throw new Error('Niveau competence invalide.')
  return text
}

function parseEvaluationRole(value: unknown): VisitEvaluationRole {
  const text = clean(value) as VisitEvaluationRole
  if (text === 'tutor' || text === 'student') return text
  return 'referent'
}

function parsePhotos(value: unknown): VisitPhoto[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 12).map((item) => {
    const record = asRecord(item)
    return {
      url: typeof record.url === 'string' ? record.url : null,
      offline_id: typeof record.offline_id === 'string' ? record.offline_id : null,
      lat: optionalNumber(record.lat),
      lng: optionalNumber(record.lng),
      taken_at: typeof record.taken_at === 'string' ? record.taken_at : new Date().toISOString(),
      caption: typeof record.caption === 'string' ? record.caption.slice(0, 160) : null,
    }
  })
}
