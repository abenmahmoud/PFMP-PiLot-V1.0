import { createServerFn } from '@tanstack/react-start'
import type {
  ClassRow,
  CompanyRow,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StageStatus,
  StudentRow,
  TeacherRow,
  TutorRow,
  UserRole,
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

export interface PlacementCreateInput {
  establishmentId?: string | null
  studentId: string
  periodId: string
  companyId: string | null
  tutorId: string | null
  referentId: string | null
  startDate: string | null
  endDate: string | null
  status: StageStatus
  notes: string | null
}

export type PlacementUpdateInput = Partial<Omit<PlacementCreateInput, 'establishmentId' | 'studentId' | 'periodId'>>

export interface PlacementWithRelations {
  placement: PlacementRow
  student: StudentRow | null
  class: ClassRow | null
  period: PfmpPeriodRow | null
  company: CompanyRow | null
  tutor: TutorRow | null
  referent: TeacherRow | null
}

interface AccessInput {
  accessToken: string
  establishmentId?: string | null
  includeArchived?: boolean
}

interface PlacementMutationInput extends AccessInput {
  placementId: string
}

const READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'referent', 'superadmin']
const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const PLACEMENT_STATUSES: StageStatus[] = [
  'draft',
  'confirmed',
  'no_stage',
  'found',
  'pending_convention',
  'signed_convention',
  'in_progress',
  'completed',
  'cancelled',
  'interrupted',
]

export const listPlacementsForPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateListForPeriodInput)
  .handler(async ({ data }): Promise<PlacementWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadPlacements(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)

      let query = adminClient
        .from('placements')
        .select('*')
        .eq('period_id', period.id)
        .order('created_at', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture placements impossible: ${error.message}`)
      return enrichPlacementsForCaller(adminClient, caller, (rows as unknown as PlacementRow[]) ?? [])
    })
  })

export const listPlacementsForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListInput)
  .handler(async ({ data }): Promise<PlacementWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadPlacements(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      let query = adminClient
        .from('placements')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture placements impossible: ${error.message}`)
      return enrichPlacementsForCaller(adminClient, caller, (rows as unknown as PlacementRow[]) ?? [])
    })
  })

export const listPlacementsForStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateListForStudentInput)
  .handler(async ({ data }): Promise<PlacementWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadPlacements(caller)
      const student = await getStudentById(adminClient, data.studentId)
      await assertCanReadStudent(caller, adminClient, student)

      let query = adminClient
        .from('placements')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture placements eleve impossible: ${error.message}`)
      return enrichPlacementsForCaller(adminClient, caller, (rows as unknown as PlacementRow[]) ?? [])
    })
  })

export const listPlacementsForReferent = createServerFn({ method: 'POST' })
  .inputValidator(validateListForReferentInput)
  .handler(async ({ data }): Promise<PlacementWithRelations[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadPlacements(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)
      const requestedReferentId = data.referentId ?? caller.id

      const teacher = await getTeacherByProfileId(adminClient, establishmentId, requestedReferentId)
      if (caller.role === 'referent' && requestedReferentId !== caller.id) {
        throw new Error('Acces refuse: un referent ne consulte que ses propres placements.')
      }

      let query = adminClient
        .from('placements')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('referent_id', teacher.id)
        .order('created_at', { ascending: false })
      if (!data.includeArchived) query = query.is('archived_at', null)
      const { data: rows, error } = await query
      if (error) throw new Error(`Lecture placements referent impossible: ${error.message}`)
      return enrichPlacementsForCaller(adminClient, caller, (rows as unknown as PlacementRow[]) ?? [])
    })
  })

export const createPlacement = createServerFn({ method: 'POST' })
  .inputValidator(validateCreateInput)
  .handler(async ({ data }): Promise<PlacementWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const student = await getStudentById(adminClient, data.data.studentId)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanMutatePlacementForStudent(caller, student, klass, 'create', data.data.establishmentId)

      const period = await getPeriodById(adminClient, data.data.periodId)
      assertResourceTenant(student.establishment_id, period.establishment_id)
      const company = data.data.companyId ? await getCompanyById(adminClient, data.data.companyId) : null
      const tutor = data.data.tutorId ? await getTutorById(adminClient, data.data.tutorId) : null
      const referent = data.data.referentId ? await getTeacherById(adminClient, data.data.referentId) : null
      assertOptionalResourceTenant(student.establishment_id, company?.establishment_id ?? null)
      assertOptionalResourceTenant(student.establishment_id, tutor?.establishment_id ?? null)
      assertOptionalResourceTenant(student.establishment_id, referent?.establishment_id ?? null)
      if (tutor && company && tutor.company_id !== company.id) throw new Error('Le tuteur ne depend pas de cette entreprise.')

      const existing = await findPlacement(adminClient, student.id, period.id)
      if (existing && !existing.archived_at) throw new Error('Un placement existe deja pour cet eleve et cette periode.')

      const placement = await insertPlacement(adminClient, student, data.data)
      if (referent?.profile_id) await syncStudentReferent(adminClient, student.id, referent.profile_id)

      await insertAuditLog(adminClient, {
        establishmentId: student.establishment_id,
        userId: caller.id,
        action: 'placement.created',
        description: `Placement cree pour ${student.first_name} ${student.last_name}`,
        metadata: {
          placement_id: placement.id,
          student_id: student.id,
          period_id: period.id,
          company_id: company?.id ?? null,
          source: 'server.placements',
        },
      })
      const [enriched] = await enrichPlacementsForCaller(adminClient, caller, [placement])
      return enriched
    })
  })

export const updatePlacement = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateInput)
  .handler(async ({ data }): Promise<PlacementWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      const student = await getStudentById(adminClient, placement.student_id)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanMutatePlacementForStudent(caller, student, klass, 'update', data.establishmentId)

      if (data.data.companyId) {
        const company = await getCompanyById(adminClient, data.data.companyId)
        assertResourceTenant(student.establishment_id, company.establishment_id)
      }
      if (data.data.tutorId) {
        const tutor = await getTutorById(adminClient, data.data.tutorId)
        assertResourceTenant(student.establishment_id, tutor.establishment_id)
      }
      if (data.data.referentId) {
        const referent = await getTeacherById(adminClient, data.data.referentId)
        assertResourceTenant(student.establishment_id, referent.establishment_id)
        if (referent.profile_id) await syncStudentReferent(adminClient, student.id, referent.profile_id)
      }

      const updated = await updatePlacementRow(adminClient, placement.id, data.data)
      await insertAuditLog(adminClient, {
        establishmentId: placement.establishment_id,
        userId: caller.id,
        action: 'placement.updated',
        description: `Placement modifie pour ${student.first_name} ${student.last_name}`,
        metadata: { placement_id: placement.id, source: 'server.placements' },
      })
      const [enriched] = await enrichPlacementsForCaller(adminClient, caller, [updated])
      return enriched
    })
  })

export const updatePlacementStatus = createServerFn({ method: 'POST' })
  .inputValidator(validateStatusInput)
  .handler(async ({ data }): Promise<PlacementWithRelations> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      const student = await getStudentById(adminClient, placement.student_id)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanMutatePlacementForStudent(caller, student, klass, 'update', data.establishmentId)

      const updated = await updatePlacementRow(adminClient, placement.id, { status: data.status })
      await insertAuditLog(adminClient, {
        establishmentId: placement.establishment_id,
        userId: caller.id,
        action: 'placement.status_updated',
        description: `Statut placement: ${placement.status} -> ${updated.status}`,
        metadata: { placement_id: placement.id, old_status: placement.status, new_status: updated.status },
      })
      const [enriched] = await enrichPlacementsForCaller(adminClient, caller, [updated])
      return enriched
    })
  })

export const archivePlacement = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      const student = await getStudentById(adminClient, placement.student_id)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanArchivePlacement(caller, student, klass, data.establishmentId)

      const archivedAt = new Date().toISOString()
      const { error } = await adminClient
        .from('placements')
        .update({ archived_at: archivedAt, updated_at: archivedAt })
        .eq('id', placement.id)
      if (error) throw new Error(`Archivage placement impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: placement.establishment_id,
        userId: caller.id,
        action: 'placement.archived',
        description: `Placement archive pour ${student.first_name} ${student.last_name}`,
        metadata: { placement_id: placement.id, source: 'server.placements' },
      })
      return { ok: true, archivedAt }
    })
  })

export const restorePlacement = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const placement = await getPlacementById(adminClient, data.placementId)
      const student = await getStudentById(adminClient, placement.student_id)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanArchivePlacement(caller, student, klass, data.establishmentId)

      const { error } = await adminClient
        .from('placements')
        .update({ archived_at: null, updated_at: new Date().toISOString() })
        .eq('id', placement.id)
      if (error) throw new Error(`Restauration placement impossible: ${error.message}`)
      await insertAuditLog(adminClient, {
        establishmentId: placement.establishment_id,
        userId: caller.id,
        action: 'placement.restored',
        description: `Placement restaure pour ${student.first_name} ${student.last_name}`,
        metadata: { placement_id: placement.id, source: 'server.placements' },
      })
      return { ok: true }
    })
  })

async function enrichPlacementsForCaller(
  adminClient: AdminClient,
  caller: ProfileRow,
  placements: PlacementRow[],
): Promise<PlacementWithRelations[]> {
  const visible = await filterVisiblePlacements(adminClient, caller, placements)
  if (visible.length === 0) return []

  const studentIds = unique(visible.map((placement) => placement.student_id))
  const periodIds = unique(visible.map((placement) => placement.period_id))
  const companyIds = unique(visible.map((placement) => placement.company_id))
  const tutorIds = unique(visible.map((placement) => placement.tutor_id))
  const referentIds = unique(visible.map((placement) => placement.referent_id))

  const [studentsResult, periodsResult, companiesResult, tutorsResult, referentsResult] = await Promise.all([
    adminClient.from('students').select('*').in('id', studentIds),
    adminClient.from('pfmp_periods').select('*').in('id', periodIds),
    companyIds.length ? adminClient.from('companies').select('*').in('id', companyIds) : Promise.resolve({ data: [], error: null }),
    tutorIds.length ? adminClient.from('tutors').select('*').in('id', tutorIds) : Promise.resolve({ data: [], error: null }),
    referentIds.length ? adminClient.from('teachers').select('*').in('id', referentIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (studentsResult.error) throw new Error(`Lecture eleves placements impossible: ${studentsResult.error.message}`)
  if (periodsResult.error) throw new Error(`Lecture periodes placements impossible: ${periodsResult.error.message}`)
  if (companiesResult.error) throw new Error(`Lecture entreprises placements impossible: ${companiesResult.error.message}`)
  if (tutorsResult.error) throw new Error(`Lecture tuteurs placements impossible: ${tutorsResult.error.message}`)
  if (referentsResult.error) throw new Error(`Lecture referents placements impossible: ${referentsResult.error.message}`)

  const students = (studentsResult.data as unknown as StudentRow[]) ?? []
  const classIds = unique(students.map((student) => student.class_id))
  const classesResult = classIds.length
    ? await adminClient.from('classes').select('*').in('id', classIds)
    : { data: [], error: null }
  if (classesResult.error) throw new Error(`Lecture classes placements impossible: ${classesResult.error.message}`)

  const studentById = indexById(students)
  const classById = indexById((classesResult.data as unknown as ClassRow[]) ?? [])
  const periodById = indexById((periodsResult.data as unknown as PfmpPeriodRow[]) ?? [])
  const companyById = indexById((companiesResult.data as unknown as CompanyRow[]) ?? [])
  const tutorById = indexById((tutorsResult.data as unknown as TutorRow[]) ?? [])
  const referentById = indexById((referentsResult.data as unknown as TeacherRow[]) ?? [])

  return visible.map((placement) => {
    const student = studentById.get(placement.student_id) ?? null
    return {
      placement,
      student,
      class: student?.class_id ? classById.get(student.class_id) ?? null : null,
      period: periodById.get(placement.period_id) ?? null,
      company: placement.company_id ? companyById.get(placement.company_id) ?? null : null,
      tutor: placement.tutor_id ? tutorById.get(placement.tutor_id) ?? null : null,
      referent: placement.referent_id ? referentById.get(placement.referent_id) ?? null : null,
    }
  })
}

async function filterVisiblePlacements(
  adminClient: AdminClient,
  caller: ProfileRow,
  placements: PlacementRow[],
): Promise<PlacementRow[]> {
  if (caller.role === 'superadmin') return placements
  if (!caller.establishment_id) return []
  const sameTenant = placements.filter((placement) => placement.establishment_id === caller.establishment_id)
  if (caller.role === 'admin' || caller.role === 'ddfpt') return sameTenant
  if (caller.role === 'referent') {
    const teacher = await getTeacherByProfileId(adminClient, caller.establishment_id, caller.id)
    return sameTenant.filter((placement) => placement.referent_id === teacher.id)
  }
  if (caller.role === 'principal') {
    const studentIds = unique(sameTenant.map((placement) => placement.student_id))
    if (studentIds.length === 0) return []
    const { data, error } = await adminClient.from('students').select('id,class_id').in('id', studentIds)
    if (error) throw new Error(`Lecture eleves principal impossible: ${error.message}`)
    const classIds = unique(((data as Array<{ class_id: string | null }>) ?? []).map((row) => row.class_id))
    if (classIds.length === 0) return []
    const { data: classes, error: classError } = await adminClient
      .from('classes')
      .select('id')
      .in('id', classIds)
      .eq('principal_id', caller.id)
    if (classError) throw new Error(`Lecture classes principal impossible: ${classError.message}`)
    const allowedClassIds = new Set(((classes as Array<{ id: string }>) ?? []).map((row) => row.id))
    const classByStudent = new Map(((data as Array<{ id: string; class_id: string | null }>) ?? []).map((row) => [row.id, row.class_id]))
    return sameTenant.filter((placement) => {
      const classId = classByStudent.get(placement.student_id)
      return classId ? allowedClassIds.has(classId) : false
    })
  }
  return []
}

async function insertPlacement(
  adminClient: AdminClient,
  student: StudentRow,
  input: PlacementCreateInput,
): Promise<PlacementRow> {
  const { data, error } = await adminClient
    .from('placements')
    .insert({
      establishment_id: student.establishment_id,
      student_id: student.id,
      period_id: input.periodId,
      company_id: input.companyId,
      tutor_id: input.tutorId,
      referent_id: input.referentId,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      notes: input.notes,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation placement impossible: ${error.message}`)
  return data as unknown as PlacementRow
}

async function updatePlacementRow(
  adminClient: AdminClient,
  placementId: string,
  input: PlacementUpdateInput,
): Promise<PlacementRow> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.companyId !== undefined) patch.company_id = input.companyId
  if (input.tutorId !== undefined) patch.tutor_id = input.tutorId
  if (input.referentId !== undefined) patch.referent_id = input.referentId
  if (input.startDate !== undefined) patch.start_date = input.startDate
  if (input.endDate !== undefined) patch.end_date = input.endDate
  if (input.status !== undefined) patch.status = input.status
  if (input.notes !== undefined) patch.notes = input.notes

  const { data, error } = await adminClient.from('placements').update(patch).eq('id', placementId).select('*').single()
  if (error) throw new Error(`Mise a jour placement impossible: ${error.message}`)
  return data as unknown as PlacementRow
}

async function syncStudentReferent(adminClient: AdminClient, studentId: string, profileId: string): Promise<void> {
  const { error } = await adminClient.from('students').update({ referent_id: profileId }).eq('id', studentId)
  if (error) throw new Error(`Synchronisation referent eleve impossible: ${error.message}`)
}

async function assertCanReadStudent(caller: ProfileRow, adminClient: AdminClient, student: StudentRow): Promise<void> {
  const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
  if (caller.role === 'superadmin') return
  if (caller.establishment_id !== student.establishment_id) throw new Error('Acces refuse: eleve hors tenant.')
  if (caller.role === 'admin' || caller.role === 'ddfpt') return
  if (caller.role === 'principal' && klass?.principal_id === caller.id) return
  if (caller.role === 'referent' && student.referent_id === caller.id) return
  throw new Error('Acces refuse: eleve non autorise.')
}

function assertCanMutatePlacementForStudent(
  caller: ProfileRow,
  student: StudentRow,
  klass: ClassRow | null,
  action: 'create' | 'update',
  requested?: string | null,
): void {
  if (MANAGE_ROLES.includes(caller.role)) {
    assertSameTenant(caller, student.establishment_id, requested)
    return
  }
  if (caller.role === 'principal' && caller.establishment_id === student.establishment_id && klass?.principal_id === caller.id) {
    return
  }
  throw new Error(`Acces refuse: ${action === 'create' ? 'creation' : 'modification'} placement non autorisee.`)
}

function assertCanArchivePlacement(
  caller: ProfileRow,
  student: StudentRow,
  klass: ClassRow | null,
  requested?: string | null,
): void {
  if (MANAGE_ROLES.includes(caller.role)) {
    assertSameTenant(caller, student.establishment_id, requested)
    return
  }
  if (klass?.principal_id === caller.id) throw new Error('Le professeur principal ne peut pas archiver un placement.')
  throw new Error('Acces refuse: archivage placement non autorise.')
}

function assertCanReadPlacements(caller: ProfileRow): void {
  if (!READ_ROLES.includes(caller.role)) throw new Error('Acces refuse: lecture placements non autorisee.')
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

function assertResourceTenant(expected: string, actual: string): void {
  if (expected !== actual) throw new Error('Acces refuse: ressource hors tenant.')
}

function assertOptionalResourceTenant(expected: string, actual: string | null): void {
  if (actual && expected !== actual) throw new Error('Acces refuse: ressource hors tenant.')
}

async function getPlacementById(adminClient: AdminClient, placementId: string): Promise<PlacementRow> {
  const { data, error } = await adminClient.from('placements').select('*').eq('id', placementId).maybeSingle()
  if (error) throw new Error(`Lecture placement impossible: ${error.message}`)
  if (!data) throw new Error('Placement introuvable.')
  return data as unknown as PlacementRow
}

async function findPlacement(adminClient: AdminClient, studentId: string, periodId: string): Promise<PlacementRow | null> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('student_id', studentId)
    .eq('period_id', periodId)
    .maybeSingle()
  if (error) throw new Error(`Recherche placement impossible: ${error.message}`)
  return (data as unknown as PlacementRow | null) ?? null
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

async function getPeriodById(adminClient: AdminClient, periodId: string): Promise<PfmpPeriodRow> {
  const { data, error } = await adminClient.from('pfmp_periods').select('*').eq('id', periodId).maybeSingle()
  if (error) throw new Error(`Lecture periode impossible: ${error.message}`)
  if (!data) throw new Error('Periode introuvable.')
  return data as unknown as PfmpPeriodRow
}

async function getCompanyById(adminClient: AdminClient, companyId: string): Promise<CompanyRow> {
  const { data, error } = await adminClient.from('companies').select('*').eq('id', companyId).maybeSingle()
  if (error) throw new Error(`Lecture entreprise impossible: ${error.message}`)
  if (!data) throw new Error('Entreprise introuvable.')
  return data as unknown as CompanyRow
}

async function getTutorById(adminClient: AdminClient, tutorId: string): Promise<TutorRow> {
  const { data, error } = await adminClient.from('tutors').select('*').eq('id', tutorId).maybeSingle()
  if (error) throw new Error(`Lecture tuteur impossible: ${error.message}`)
  if (!data) throw new Error('Tuteur introuvable.')
  return data as unknown as TutorRow
}

async function getTeacherById(adminClient: AdminClient, teacherId: string): Promise<TeacherRow> {
  const { data, error } = await adminClient.from('teachers').select('*').eq('id', teacherId).maybeSingle()
  if (error) throw new Error(`Lecture referent impossible: ${error.message}`)
  if (!data) throw new Error('Referent introuvable.')
  return data as unknown as TeacherRow
}

async function getTeacherByProfileId(adminClient: AdminClient, establishmentId: string, profileId: string): Promise<TeacherRow> {
  const { data, error } = await adminClient
    .from('teachers')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw new Error(`Lecture professeur impossible: ${error.message}`)
  if (!data) throw new Error('Profil professeur introuvable dans l annuaire.')
  return data as unknown as TeacherRow
}

function validateListForPeriodInput(data: unknown): AccessInput & { periodId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
    periodId: validateUuid(record.periodId, 'Periode'),
  }
}

function validateListInput(data: unknown): AccessInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
  }
}

function validateListForStudentInput(data: unknown): AccessInput & { studentId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
    studentId: validateUuid(record.studentId, 'Eleve'),
  }
}

function validateListForReferentInput(data: unknown): AccessInput & { referentId: string | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
    referentId: optionalUuid(record.referentId, 'Referent'),
  }
}

function validateCreateInput(data: unknown): { accessToken: string; data: PlacementCreateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    data: validateCreateData(asRecord(record.data)),
  }
}

function validateUpdateInput(data: unknown): PlacementMutationInput & { data: PlacementUpdateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    placementId: validateUuid(record.placementId, 'Placement'),
    data: validateUpdateData(asRecord(record.data)),
  }
}

function validateStatusInput(data: unknown): PlacementMutationInput & { status: StageStatus } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    placementId: validateUuid(record.placementId, 'Placement'),
    status: requiredEnum(record.status, PLACEMENT_STATUSES, 'Statut'),
  }
}

function validateMutationInput(data: unknown): PlacementMutationInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    placementId: validateUuid(record.placementId, 'Placement'),
  }
}

function validateCreateData(record: Record<string, unknown>): PlacementCreateInput {
  const startDate = optionalDate(record.startDate, 'Date debut')
  const endDate = optionalDate(record.endDate, 'Date fin')
  if (startDate && endDate && endDate < startDate) throw new Error('La date de fin doit etre apres la date de debut.')
  const companyId = optionalUuid(record.companyId, 'Entreprise')
  const status = optionalEnum(record.status, PLACEMENT_STATUSES, 'Statut') ?? (companyId ? 'found' : 'no_stage')
  return {
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    studentId: validateUuid(record.studentId, 'Eleve'),
    periodId: validateUuid(record.periodId, 'Periode'),
    companyId,
    tutorId: optionalUuid(record.tutorId, 'Tuteur'),
    referentId: optionalUuid(record.referentId, 'Referent'),
    startDate,
    endDate,
    status,
    notes: optionalText(record.notes),
  }
}

function validateUpdateData(record: Record<string, unknown>): PlacementUpdateInput {
  const result: PlacementUpdateInput = {}
  if (record.companyId !== undefined) {
    result.companyId = optionalUuid(record.companyId, 'Entreprise')
    if (result.companyId && record.status === undefined) result.status = 'found'
  }
  if (record.tutorId !== undefined) result.tutorId = optionalUuid(record.tutorId, 'Tuteur')
  if (record.referentId !== undefined) result.referentId = optionalUuid(record.referentId, 'Referent')
  if (record.startDate !== undefined) result.startDate = optionalDate(record.startDate, 'Date debut')
  if (record.endDate !== undefined) result.endDate = optionalDate(record.endDate, 'Date fin')
  if (record.status !== undefined) result.status = requiredEnum(record.status, PLACEMENT_STATUSES, 'Statut')
  if (record.notes !== undefined) result.notes = optionalText(record.notes)
  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    throw new Error('La date de fin doit etre apres la date de debut.')
  }
  return result
}

function asRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Payload invalide.')
  return data as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} requis.`)
  return text
}

function optionalText(value: unknown): string | null {
  const text = clean(value)
  return text || null
}

function optionalUuid(value: unknown, label: string): string | null {
  const uuid = clean(value)
  return uuid ? validateUuid(uuid, label) : null
}

function optionalDate(value: unknown, label: string): string | null {
  const text = clean(value)
  if (!text) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} invalide.`)
  return text
}

function requiredEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  const text = requiredString(value, label)
  if (!allowed.includes(text as T)) throw new Error(`${label} invalide.`)
  return text as T
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | null {
  const text = clean(value)
  if (!text) return null
  if (!allowed.includes(text as T)) throw new Error(`${label} invalide.`)
  return text as T
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
