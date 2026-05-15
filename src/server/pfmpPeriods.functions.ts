import { createServerFn } from '@tanstack/react-start'
import type { ClassRow, PeriodStatus, PfmpPeriodRow, PlacementRow, ProfileRow, StudentRow, UserRole } from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'
import { ensureConventionDocumentsForPeriodInternal } from './documents.functions'

export type PfmpPeriodType = 'pfmp_1' | 'pfmp_2' | 'pfmp_3' | 'stage_decouverte' | 'autre'

export interface PfmpPeriodCreateInput {
  establishmentId?: string | null
  classId: string | null
  name: string
  type: PfmpPeriodType
  startDate: string
  endDate: string
  schoolYear: string
  status?: PeriodStatus
  notes: string | null
}

export type PfmpPeriodUpdateInput = Partial<Omit<PfmpPeriodCreateInput, 'establishmentId'>>

export interface PfmpPeriodWithStats {
  period: PfmpPeriodRow
  class: ClassRow | null
  studentCount: number
  placementsCount: number
  completedCount: number
}

interface AccessInput {
  accessToken: string
  establishmentId?: string | null
  includeArchived?: boolean
}

interface PeriodMutationInput extends AccessInput {
  periodId: string
}

export interface PeriodDossierSyncResult {
  ok: true
  periodId: string
  classId: string | null
  students: number
  created: number
  conventionDocumentsCreated?: number
  conventionDocumentsUpdated?: number
}

const READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'referent', 'superadmin']
const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const PERIOD_TYPES: PfmpPeriodType[] = ['pfmp_1', 'pfmp_2', 'pfmp_3', 'stage_decouverte', 'autre']
const PERIOD_STATUSES: PeriodStatus[] = ['draft', 'published', 'preparation', 'in_progress', 'completed', 'cancelled', 'archived']

export const listPfmpPeriodsForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListInput)
  .handler(async ({ data }): Promise<PfmpPeriodWithStats[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadPeriods(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      let query = adminClient
        .from('pfmp_periods')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('start_date', { ascending: false })

      if (!data.includeArchived) query = query.is('archived_at', null)

      const { data: periodRows, error } = await query
      if (error) throw new Error(`Lecture periodes PFMP impossible: ${error.message}`)

      const periods = (periodRows as unknown as PfmpPeriodRow[]) ?? []
      return enrichPeriods(adminClient, periods)
    })
  })

export const createPfmpPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateCreateInput)
  .handler(async ({ data }): Promise<PfmpPeriodRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const establishmentId = resolveEstablishmentId(caller, data.data.establishmentId)
      if (data.data.classId) await assertClassInTenant(adminClient, data.data.classId, establishmentId)

      const period = await insertPeriod(adminClient, establishmentId, data.data)
      await syncPeriodClassLink(adminClient, period.id, period.class_id)
      const sync = await ensureStudentDossiersForPeriod(adminClient, period)
      const conventionSync = await ensureConventionDocumentsForPeriodInternal(adminClient, caller, period.id, establishmentId)
      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'pfmp_period.created',
        description: `Periode PFMP creee: ${period.name}`,
        metadata: {
          period_id: period.id,
          class_id: period.class_id,
          dossiers_created: sync.created,
          convention_documents_created: conventionSync.created,
          convention_documents_updated: conventionSync.updated,
          source: 'server.pfmpPeriods',
        },
      })
      return period
    })
  })

export const updatePfmpPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateInput)
  .handler(async ({ data }): Promise<PfmpPeriodRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)
      if (data.data.classId) await assertClassInTenant(adminClient, data.data.classId, period.establishment_id)

      const updated = await updatePeriodRow(adminClient, period.id, data.data)
      if (data.data.classId !== undefined) await syncPeriodClassLink(adminClient, updated.id, updated.class_id)
      const sync = await ensureStudentDossiersForPeriod(adminClient, updated)
      const conventionSync = await ensureConventionDocumentsForPeriodInternal(adminClient, caller, updated.id, period.establishment_id)
      await insertAuditLog(adminClient, {
        establishmentId: period.establishment_id,
        userId: caller.id,
        action: 'pfmp_period.updated',
        description: `Periode PFMP modifiee: ${updated.name}`,
        metadata: {
          period_id: updated.id,
          class_id: updated.class_id,
          dossiers_created: sync.created,
          convention_documents_created: conventionSync.created,
          convention_documents_updated: conventionSync.updated,
          source: 'server.pfmpPeriods',
        },
      })
      return updated
    })
  })

export const archivePfmpPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)

      const archivedAt = new Date().toISOString()
      const { error } = await adminClient
        .from('pfmp_periods')
        .update({ archived_at: archivedAt, status: 'archived', updated_at: archivedAt })
        .eq('id', period.id)
      if (error) throw new Error(`Archivage periode impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: period.establishment_id,
        userId: caller.id,
        action: 'pfmp_period.archived',
        description: `Periode PFMP archivee: ${period.name}`,
        metadata: { period_id: period.id, source: 'server.pfmpPeriods' },
      })
      return { ok: true, archivedAt }
    })
  })

export const restorePfmpPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)

      const { error } = await adminClient
        .from('pfmp_periods')
        .update({ archived_at: null, status: period.status === 'archived' ? 'draft' : period.status, updated_at: new Date().toISOString() })
        .eq('id', period.id)
      if (error) throw new Error(`Restauration periode impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: period.establishment_id,
        userId: caller.id,
        action: 'pfmp_period.restored',
        description: `Periode PFMP restauree: ${period.name}`,
        metadata: { period_id: period.id, source: 'server.pfmpPeriods' },
      })
      return { ok: true }
    })
  })

export const publishPfmpPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<PfmpPeriodRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)

      const updated = await updatePeriodRow(adminClient, period.id, { status: 'published' })
      const sync = await ensureStudentDossiersForPeriod(adminClient, updated)
      const conventionSync = await ensureConventionDocumentsForPeriodInternal(adminClient, caller, updated.id, period.establishment_id)
      await insertAuditLog(adminClient, {
        establishmentId: period.establishment_id,
        userId: caller.id,
        action: 'pfmp_period.published',
        description: `Periode PFMP publiee: ${period.name}`,
        metadata: {
          period_id: period.id,
          dossiers_created: sync.created,
          convention_documents_created: conventionSync.created,
          convention_documents_updated: conventionSync.updated,
          source: 'server.pfmpPeriods',
        },
      })
      return updated
    })
  })

export const syncPfmpPeriodStudentDossiers = createServerFn({ method: 'POST' })
  .inputValidator(validateMutationInput)
  .handler(async ({ data }): Promise<PeriodDossierSyncResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManagePeriods(caller)
      const period = await getPeriodById(adminClient, data.periodId)
      assertSameTenant(caller, period.establishment_id, data.establishmentId)

      const sync = await ensureStudentDossiersForPeriod(adminClient, period)
      const conventionSync = await ensureConventionDocumentsForPeriodInternal(adminClient, caller, period.id, period.establishment_id)
      await insertAuditLog(adminClient, {
        establishmentId: period.establishment_id,
        userId: caller.id,
        action: 'pfmp_period.dossiers_synced',
        description: `Dossiers eleves synchronises: ${period.name}`,
        metadata: {
          period_id: period.id,
          class_id: period.class_id,
          students: sync.students,
          created: sync.created,
          convention_documents_created: conventionSync.created,
          convention_documents_updated: conventionSync.updated,
          source: 'server.pfmpPeriods',
        },
      })
      return {
        ...sync,
        conventionDocumentsCreated: conventionSync.created,
        conventionDocumentsUpdated: conventionSync.updated,
      }
    })
  })

async function enrichPeriods(adminClient: AdminClient, periods: PfmpPeriodRow[]): Promise<PfmpPeriodWithStats[]> {
  if (periods.length === 0) return []
  const periodIds = periods.map((period) => period.id)

  const [linksResult, placementsResult] = await Promise.all([
    adminClient.from('pfmp_period_classes').select('*').in('period_id', periodIds),
    adminClient.from('placements').select('*').in('period_id', periodIds).is('archived_at', null),
  ])
  if (linksResult.error) throw new Error(`Lecture classes periodes impossible: ${linksResult.error.message}`)
  if (placementsResult.error) throw new Error(`Lecture placements periodes impossible: ${placementsResult.error.message}`)

  const links = (linksResult.data as Array<{ period_id: string; class_id: string }>) ?? []
  const classIds = unique([...periods.map((period) => period.class_id), ...links.map((link) => link.class_id)])
  const classesResult =
    classIds.length > 0
      ? await adminClient.from('classes').select('*').in('id', classIds)
      : { data: [], error: null }
  if (classesResult.error) throw new Error(`Lecture classes impossible: ${classesResult.error.message}`)

  const classes = (classesResult.data as unknown as ClassRow[]) ?? []
  const studentsResult =
    classIds.length > 0
      ? await adminClient.from('students').select('id,class_id').in('class_id', classIds).is('archived_at', null)
      : { data: [], error: null }
  if (studentsResult.error) throw new Error(`Lecture eleves impossible: ${studentsResult.error.message}`)

  const classById = new Map(classes.map((klass) => [klass.id, klass]))
  const linksByPeriod = groupBy(links, (link) => link.period_id)
  const studentsByClass = groupBy(
    ((studentsResult.data as Array<{ id: string; class_id: string | null }>) ?? []).filter((student) => student.class_id),
    (student) => student.class_id ?? '',
  )
  const placementsByPeriod = groupBy((placementsResult.data as unknown as PlacementRow[]) ?? [], (placement) => placement.period_id)

  return periods.map((period) => {
    const linkedClassId = period.class_id ?? linksByPeriod.get(period.id)?.[0]?.class_id ?? null
    const klass = linkedClassId ? classById.get(linkedClassId) ?? null : null
    const classStudents = linkedClassId ? studentsByClass.get(linkedClassId) ?? [] : []
    const placements = placementsByPeriod.get(period.id) ?? []
    return {
      period,
      class: klass,
      studentCount: classStudents.length,
      placementsCount: placements.length,
      completedCount: placements.filter((placement) => placement.status === 'completed').length,
    }
  })
}

async function insertPeriod(
  adminClient: AdminClient,
  establishmentId: string,
  input: PfmpPeriodCreateInput,
): Promise<PfmpPeriodRow> {
  const { data, error } = await adminClient
    .from('pfmp_periods')
    .insert({
      establishment_id: establishmentId,
      class_id: input.classId,
      name: input.name,
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      school_year: input.schoolYear,
      status: input.status ?? 'draft',
      notes: input.notes,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation periode PFMP impossible: ${error.message}`)
  return data as unknown as PfmpPeriodRow
}

async function updatePeriodRow(
  adminClient: AdminClient,
  periodId: string,
  input: PfmpPeriodUpdateInput,
): Promise<PfmpPeriodRow> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.classId !== undefined) patch.class_id = input.classId
  if (input.name !== undefined) patch.name = input.name
  if (input.type !== undefined) patch.type = input.type
  if (input.startDate !== undefined) patch.start_date = input.startDate
  if (input.endDate !== undefined) patch.end_date = input.endDate
  if (input.schoolYear !== undefined) patch.school_year = input.schoolYear
  if (input.status !== undefined) patch.status = input.status
  if (input.notes !== undefined) patch.notes = input.notes

  const { data, error } = await adminClient.from('pfmp_periods').update(patch).eq('id', periodId).select('*').single()
  if (error) throw new Error(`Mise a jour periode PFMP impossible: ${error.message}`)
  return data as unknown as PfmpPeriodRow
}

async function syncPeriodClassLink(adminClient: AdminClient, periodId: string, classId: string | null): Promise<void> {
  const { error: deleteError } = await adminClient.from('pfmp_period_classes').delete().eq('period_id', periodId)
  if (deleteError) throw new Error(`Synchronisation classe periode impossible: ${deleteError.message}`)
  if (!classId) return
  const { error } = await adminClient.from('pfmp_period_classes').insert({ period_id: periodId, class_id: classId })
  if (error) throw new Error(`Lien classe periode impossible: ${error.message}`)
}

async function ensureStudentDossiersForPeriod(
  adminClient: AdminClient,
  period: PfmpPeriodRow,
): Promise<PeriodDossierSyncResult> {
  if (!period.class_id) {
    return { ok: true, periodId: period.id, classId: null, students: 0, created: 0 }
  }

  const { data: studentRows, error: studentsError } = await adminClient
    .from('students')
    .select('*')
    .eq('establishment_id', period.establishment_id)
    .eq('class_id', period.class_id)
    .is('archived_at', null)
  if (studentsError) throw new Error(`Lecture eleves periode impossible: ${studentsError.message}`)

  const students = (studentRows as unknown as StudentRow[]) ?? []
  if (students.length === 0) {
    return { ok: true, periodId: period.id, classId: period.class_id, students: 0, created: 0 }
  }

  const studentIds = students.map((student) => student.id)
  const { data: existingRows, error: existingError } = await adminClient
    .from('placements')
    .select('student_id')
    .eq('period_id', period.id)
    .in('student_id', studentIds)
    .is('archived_at', null)
  if (existingError) throw new Error(`Lecture dossiers PFMP existants impossible: ${existingError.message}`)

  const existing = new Set(((existingRows as Array<{ student_id: string }>) ?? []).map((row) => row.student_id))
  const missing = students.filter((student) => !existing.has(student.id))
  if (missing.length === 0) {
    return { ok: true, periodId: period.id, classId: period.class_id, students: students.length, created: 0 }
  }

  const now = new Date().toISOString()
  const { error: insertError } = await adminClient.from('placements').insert(
    missing.map((student) => ({
      establishment_id: period.establishment_id,
      student_id: student.id,
      period_id: period.id,
      company_id: null,
      tutor_id: null,
      referent_id: null,
      start_date: null,
      end_date: null,
      status: 'no_stage',
      notes: 'Dossier PFMP ouvert automatiquement: eleve en recherche de stage.',
      created_at: now,
      updated_at: now,
    })),
  )
  if (insertError) throw new Error(`Creation dossiers PFMP eleves impossible: ${insertError.message}`)

  return { ok: true, periodId: period.id, classId: period.class_id, students: students.length, created: missing.length }
}

async function getPeriodById(adminClient: AdminClient, periodId: string): Promise<PfmpPeriodRow> {
  const { data, error } = await adminClient.from('pfmp_periods').select('*').eq('id', periodId).maybeSingle()
  if (error) throw new Error(`Lecture periode impossible: ${error.message}`)
  if (!data) throw new Error('Periode PFMP introuvable.')
  return data as unknown as PfmpPeriodRow
}

async function assertClassInTenant(adminClient: AdminClient, classId: string, establishmentId: string): Promise<void> {
  const { data, error } = await adminClient.from('classes').select('id,establishment_id').eq('id', classId).maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  if (!data) throw new Error('Classe introuvable.')
  if ((data as { establishment_id: string }).establishment_id !== establishmentId) throw new Error('Classe hors tenant.')
}

function validateListInput(data: unknown): AccessInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
  }
}

function validateCreateInput(data: unknown): { accessToken: string; data: PfmpPeriodCreateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    data: validateCreateData(asRecord(record.data)),
  }
}

function validateUpdateInput(data: unknown): PeriodMutationInput & { data: PfmpPeriodUpdateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    periodId: validateUuid(record.periodId, 'Periode'),
    data: validateUpdateData(asRecord(record.data)),
  }
}

function validateMutationInput(data: unknown): PeriodMutationInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    periodId: validateUuid(record.periodId, 'Periode'),
  }
}

function validateCreateData(record: Record<string, unknown>): PfmpPeriodCreateInput {
  const startDate = requiredDate(record.startDate, 'Date debut')
  const endDate = requiredDate(record.endDate, 'Date fin')
  if (endDate < startDate) throw new Error('La date de fin doit etre apres la date de debut.')
  return {
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    classId: optionalUuid(record.classId, 'Classe'),
    name: requiredString(record.name, 'Nom periode'),
    type: requiredEnum(record.type, PERIOD_TYPES, 'Type periode'),
    startDate,
    endDate,
    schoolYear: requiredString(record.schoolYear, 'Annee scolaire'),
    status: optionalEnum(record.status, PERIOD_STATUSES, 'Statut') ?? 'draft',
    notes: optionalText(record.notes),
  }
}

function validateUpdateData(record: Record<string, unknown>): PfmpPeriodUpdateInput {
  const result: PfmpPeriodUpdateInput = {}
  if (record.classId !== undefined) result.classId = optionalUuid(record.classId, 'Classe')
  if (record.name !== undefined) result.name = requiredString(record.name, 'Nom periode')
  if (record.type !== undefined) result.type = requiredEnum(record.type, PERIOD_TYPES, 'Type periode')
  if (record.startDate !== undefined) result.startDate = requiredDate(record.startDate, 'Date debut')
  if (record.endDate !== undefined) result.endDate = requiredDate(record.endDate, 'Date fin')
  if (record.schoolYear !== undefined) result.schoolYear = requiredString(record.schoolYear, 'Annee scolaire')
  if (record.status !== undefined) result.status = requiredEnum(record.status, PERIOD_STATUSES, 'Statut')
  if (record.notes !== undefined) result.notes = optionalText(record.notes)
  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    throw new Error('La date de fin doit etre apres la date de debut.')
  }
  return result
}

function assertCanReadPeriods(caller: ProfileRow): void {
  if (!READ_ROLES.includes(caller.role)) throw new Error('Acces refuse: lecture periodes non autorisee.')
}

function assertCanManagePeriods(caller: ProfileRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: seuls admin, DDFPT et superadmin peuvent modifier les periodes.')
  }
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

function requiredDate(value: unknown, label: string): string {
  const text = requiredString(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} invalide.`)
  return text
}

function optionalUuid(value: unknown, label: string): string | null {
  const uuid = clean(value)
  return uuid ? validateUuid(uuid, label) : null
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

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const value = key(row)
    if (!value) continue
    const list = map.get(value) ?? []
    list.push(row)
    map.set(value, list)
  }
  return map
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
