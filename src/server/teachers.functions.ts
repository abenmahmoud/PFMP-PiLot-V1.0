import { createServerFn } from '@tanstack/react-start'
import type { ClassRow, ProfileRow, TeacherRow, UserRole } from '@/lib/database.types'
import { inviteUserToEstablishmentUnsafe } from './invitations.functions'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

export interface TeacherCreateInput {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  discipline: string | null
  sendInvitation: boolean
}

export interface TeacherUpdateInput {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  discipline?: string | null
}

export interface TeacherImportRow {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  discipline?: string | null
}

export interface TeacherWithStats extends TeacherRow {
  principal_of_classes: string[]
  referent_of_count: number
  role: UserRole | null
}

export interface ImportTeachersResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

interface CreateTeacherInput {
  accessToken: string
  data: TeacherCreateInput
}

interface UpdateTeacherInput {
  accessToken: string
  teacherId: string
  data: TeacherUpdateInput
}

interface ArchiveTeacherInput {
  accessToken: string
  teacherId: string
}

interface ImportTeachersInput {
  accessToken: string
  rows: TeacherImportRow[]
}

interface ListTeachersInput {
  accessToken: string
  establishmentId?: string | null
}

const TEACHER_MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const TEACHER_READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'superadmin']

export const createTeacher = createServerFn({ method: 'POST' })
  .inputValidator(validateCreateTeacherInput)
  .handler(async ({ data }): Promise<TeacherRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const establishmentId = resolveWritableEstablishment(caller)
      assertCanManageTeachers(caller)

      if (data.data.email && data.data.sendInvitation) {
        const invited = await inviteUserToEstablishmentUnsafe({
          accessToken: data.accessToken,
          establishmentId,
          email: data.data.email,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          role: 'referent',
        })

        const teacher = await findTeacherByProfileOrEmail(adminClient, {
          establishmentId,
          profileId: invited.userId,
          email: invited.email,
        })
        if (!teacher) throw new Error('Professeur invite introuvable apres creation du compte.')

        await updateTeacherRow(adminClient, teacher.id, {
          phone: data.data.phone,
          discipline: data.data.discipline,
        })

        const refreshed = await getTeacherById(adminClient, teacher.id)
        await insertAuditLog(adminClient, {
          establishmentId,
          userId: caller.id,
          action: 'teacher.created',
          description: `Professeur invite: ${data.data.firstName} ${data.data.lastName}`,
          metadata: { teacher_id: teacher.id, email: invited.email, source: 'server.teachers' },
        })
        return refreshed
      }

      const inserted = await insertTeacherRow(adminClient, {
        establishment_id: establishmentId,
        profile_id: null,
        first_name: data.data.firstName,
        last_name: data.data.lastName,
        email: data.data.email,
        phone: data.data.phone,
        discipline: data.data.discipline,
      })

      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'teacher.created',
        description: `Professeur cree: ${inserted.first_name} ${inserted.last_name}`,
        metadata: { teacher_id: inserted.id, has_email: Boolean(inserted.email), source: 'server.teachers' },
      })
      return inserted
    })
  })

export const updateTeacher = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateTeacherInput)
  .handler(async ({ data }): Promise<TeacherRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageTeachers(caller)

      const teacher = await getTeacherById(adminClient, data.teacherId)
      assertSameTenant(caller, teacher.establishment_id)

      const updated = await updateTeacherRow(adminClient, teacher.id, data.data)
      await insertAuditLog(adminClient, {
        establishmentId: teacher.establishment_id,
        userId: caller.id,
        action: 'teacher.updated',
        description: `Professeur modifie: ${updated.first_name} ${updated.last_name}`,
        metadata: { teacher_id: teacher.id, source: 'server.teachers' },
      })
      return updated
    })
  })

export const archiveTeacher = createServerFn({ method: 'POST' })
  .inputValidator(validateArchiveTeacherInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageTeachers(caller)

      const teacher = await getTeacherById(adminClient, data.teacherId)
      assertSameTenant(caller, teacher.establishment_id)

      const archivedAt = new Date().toISOString()
      const { error: archiveError } = await adminClient
        .from('teachers')
        .update({ archived_at: archivedAt })
        .eq('id', teacher.id)
      if (archiveError) throw new Error(`Archivage professeur impossible: ${archiveError.message}`)

      if (teacher.profile_id) {
        const { error: classError } = await adminClient
          .from('classes')
          .update({ principal_id: null })
          .eq('principal_id', teacher.profile_id)
        if (classError) throw new Error(`Retrait professeur principal impossible: ${classError.message}`)

        const { error: studentError } = await adminClient
          .from('students')
          .update({ referent_id: null })
          .eq('referent_id', teacher.profile_id)
        if (studentError) throw new Error(`Retrait referent eleves impossible: ${studentError.message}`)
      }

      await insertAuditLog(adminClient, {
        establishmentId: teacher.establishment_id,
        userId: caller.id,
        action: 'teacher.archived',
        description: `Professeur archive: ${teacher.first_name} ${teacher.last_name}`,
        metadata: { teacher_id: teacher.id, profile_id: teacher.profile_id, source: 'server.teachers' },
      })
      return { ok: true, archivedAt }
    })
  })

export const importTeachers = createServerFn({ method: 'POST' })
  .inputValidator(validateImportTeachersInput)
  .handler(async ({ data }): Promise<ImportTeachersResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const establishmentId = resolveWritableEstablishment(caller)
      assertCanManageTeachers(caller)

      let created = 0
      let updated = 0
      let skipped = 0
      const errors: string[] = []

      for (const [index, row] of data.rows.entries()) {
        try {
          if (row.email) {
            const existing = await findTeacherByProfileOrEmail(adminClient, {
              establishmentId,
              email: row.email,
              profileId: null,
            })
            if (existing) {
              await updateTeacherRow(adminClient, existing.id, rowToUpdate(row))
              updated += 1
              continue
            }
          }
          await insertTeacherRow(adminClient, {
            establishment_id: establishmentId,
            profile_id: null,
            first_name: row.firstName,
            last_name: row.lastName,
            email: row.email ?? null,
            phone: row.phone ?? null,
            discipline: row.discipline ?? null,
          })
          created += 1
        } catch (error) {
          skipped += 1
          errors.push(`Ligne ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'teacher.bulk_imported',
        description: `Import professeurs: ${created} crees, ${updated} mis a jour`,
        metadata: { created, updated, skipped, errors_count: errors.length, source: 'server.teachers' },
      })
      return { created, updated, skipped, errors }
    })
  })

export const listTeachersForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListTeachersInput)
  .handler(async ({ data }): Promise<TeacherWithStats[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      if (!TEACHER_READ_ROLES.includes(caller.role)) {
        throw new Error('Acces refuse: annuaire professeurs non autorise.')
      }
      const establishmentId = resolveReadableEstablishment(caller, data.establishmentId)
      return listTeachersWithStats(adminClient, establishmentId)
    })
  })

async function listTeachersWithStats(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<TeacherWithStats[]> {
  const { data: teachers, error } = await adminClient
    .from('teachers')
    .select('*')
    .eq('establishment_id', establishmentId)
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')
  if (error) throw new Error(`Lecture professeurs impossible: ${error.message}`)

  const rows = ((teachers as TeacherRow[]) ?? []) as TeacherRow[]
  if (rows.length === 0) return []

  const profileIds = rows.map((row) => row.profile_id).filter(Boolean) as string[]
  const teacherIds = rows.map((row) => row.id)
  const [classesResult, studentsResult, profilesResult] = await Promise.all([
    profileIds.length > 0
      ? adminClient.from('classes').select('*').in('principal_id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length > 0
      ? adminClient.from('students').select('id, referent_id').in('referent_id', profileIds).is('archived_at', null)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length > 0
      ? adminClient.from('profiles').select('id, role').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (classesResult.error) throw new Error(`Lecture classes principales impossible: ${classesResult.error.message}`)
  if (studentsResult.error) throw new Error(`Lecture eleves referents impossible: ${studentsResult.error.message}`)
  if (profilesResult.error) throw new Error(`Lecture roles professeurs impossible: ${profilesResult.error.message}`)

  const classesByPrincipal = groupBy((classesResult.data as ClassRow[]) ?? [], (klass) => klass.principal_id ?? '')
  const studentsByReferent = groupBy(
    (studentsResult.data as Array<{ id: string; referent_id: string | null }>) ?? [],
    (student) => student.referent_id ?? '',
  )
  const roleByProfile = new Map(
    ((profilesResult.data as Array<{ id: string; role: UserRole }>) ?? []).map((profile) => [
      profile.id,
      profile.role,
    ]),
  )
  const knownTeacherIds = new Set(teacherIds)

  return rows
    .filter((teacher) => knownTeacherIds.has(teacher.id))
    .map((teacher) => ({
      ...teacher,
      principal_of_classes: teacher.profile_id
        ? (classesByPrincipal.get(teacher.profile_id) ?? []).map((klass) => klass.name)
        : [],
      referent_of_count: teacher.profile_id ? studentsByReferent.get(teacher.profile_id)?.length ?? 0 : 0,
      role: teacher.profile_id ? roleByProfile.get(teacher.profile_id) ?? null : null,
    }))
}

function validateCreateTeacherInput(raw: unknown): CreateTeacherInput {
  const data = raw as Partial<CreateTeacherInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    data: validateTeacherCreate(data.data),
  }
}

function validateUpdateTeacherInput(raw: unknown): UpdateTeacherInput {
  const data = raw as Partial<UpdateTeacherInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    teacherId: validateUuid(data.teacherId, 'Professeur'),
    data: validateTeacherUpdate(data.data),
  }
}

function validateArchiveTeacherInput(raw: unknown): ArchiveTeacherInput {
  const data = raw as Partial<ArchiveTeacherInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    teacherId: validateUuid(data.teacherId, 'Professeur'),
  }
}

function validateImportTeachersInput(raw: unknown): ImportTeachersInput {
  const data = raw as Partial<ImportTeachersInput>
  const rows = Array.isArray(data.rows) ? data.rows.map(validateTeacherImportRow).filter(Boolean) : []
  if (rows.length === 0) throw new Error('Aucune ligne professeur valide.')
  if (rows.length > 200) throw new Error('Import limite a 200 professeurs par batch.')
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    rows: rows as TeacherImportRow[],
  }
}

function validateListTeachersInput(raw: unknown): ListTeachersInput {
  const data = raw as Partial<ListTeachersInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    establishmentId: data.establishmentId ? validateUuid(data.establishmentId, 'Etablissement') : null,
  }
}

function validateTeacherCreate(raw: unknown): TeacherCreateInput {
  const data = raw as Partial<TeacherCreateInput>
  const firstName = clean(data.firstName)
  const lastName = clean(data.lastName)
  if (!firstName) throw new Error('Prenom professeur obligatoire.')
  if (!lastName) throw new Error('Nom professeur obligatoire.')
  const email = normalizeEmailNullable(data.email)
  return {
    firstName,
    lastName,
    email,
    phone: nullableText(data.phone),
    discipline: nullableText(data.discipline),
    sendInvitation: Boolean(data.sendInvitation && email),
  }
}

function validateTeacherUpdate(raw: unknown): TeacherUpdateInput {
  const data = raw as Partial<TeacherUpdateInput>
  const next: TeacherUpdateInput = {}
  if ('firstName' in data) next.firstName = requiredOrUndefined(data.firstName, 'Prenom')
  if ('lastName' in data) next.lastName = requiredOrUndefined(data.lastName, 'Nom')
  if ('email' in data) next.email = normalizeEmailNullable(data.email)
  if ('phone' in data) next.phone = nullableText(data.phone)
  if ('discipline' in data) next.discipline = nullableText(data.discipline)
  if (Object.keys(next).length === 0) throw new Error('Aucune donnee a mettre a jour.')
  return next
}

function validateTeacherImportRow(raw: unknown): TeacherImportRow | null {
  const data = raw as Partial<TeacherImportRow>
  const firstName = clean(data.firstName)
  const lastName = clean(data.lastName)
  if (!firstName || !lastName) return null
  return {
    firstName,
    lastName,
    email: normalizeEmailNullable(data.email),
    phone: nullableText(data.phone),
    discipline: nullableText(data.discipline),
  }
}

function assertCanManageTeachers(caller: ProfileRow): void {
  if (!TEACHER_MANAGE_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: seuls admin, DDFPT et superadmin peuvent gerer les professeurs.')
  }
}

function assertSameTenant(caller: ProfileRow, establishmentId: string): void {
  if (caller.role === 'superadmin') return
  if (!caller.establishment_id || caller.establishment_id !== establishmentId) {
    throw new Error('Acces refuse: professeur hors etablissement.')
  }
}

function resolveWritableEstablishment(caller: ProfileRow): string {
  if (!caller.establishment_id) {
    throw new Error('Etablissement actif requis pour gerer les professeurs.')
  }
  return caller.establishment_id
}

function resolveReadableEstablishment(caller: ProfileRow, requested?: string | null): string {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ?? caller.establishment_id
    if (!establishmentId) throw new Error('Etablissement actif requis pour lire les professeurs.')
    return establishmentId
  }
  if (!caller.establishment_id) {
    throw new Error('Etablissement actif requis pour lire les professeurs.')
  }
  if (requested && requested !== caller.establishment_id) {
    throw new Error('Acces refuse: etablissement hors perimetre.')
  }
  return caller.establishment_id
}

async function insertTeacherRow(
  adminClient: AdminClient,
  row: {
    establishment_id: string
    profile_id: string | null
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    discipline: string | null
  },
): Promise<TeacherRow> {
  const { data, error } = await adminClient.from('teachers').insert(row).select('*').single()
  if (error) throw new Error(`Creation professeur impossible: ${error.message}`)
  return data as unknown as TeacherRow
}

async function updateTeacherRow(
  adminClient: AdminClient,
  teacherId: string,
  input: TeacherUpdateInput,
): Promise<TeacherRow> {
  const patch: Record<string, string | null> = {}
  if (input.firstName !== undefined) patch.first_name = input.firstName
  if (input.lastName !== undefined) patch.last_name = input.lastName
  if (input.email !== undefined) patch.email = input.email
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.discipline !== undefined) patch.discipline = input.discipline

  const { data, error } = await adminClient
    .from('teachers')
    .update(patch)
    .eq('id', teacherId)
    .select('*')
    .single()
  if (error) throw new Error(`Mise a jour professeur impossible: ${error.message}`)
  return data as unknown as TeacherRow
}

async function getTeacherById(adminClient: AdminClient, teacherId: string): Promise<TeacherRow> {
  const { data, error } = await adminClient.from('teachers').select('*').eq('id', teacherId).maybeSingle()
  if (error) throw new Error(`Lecture professeur impossible: ${error.message}`)
  if (!data) throw new Error('Professeur introuvable.')
  return data as unknown as TeacherRow
}

async function findTeacherByProfileOrEmail(
  adminClient: AdminClient,
  input: { establishmentId: string; profileId: string | null; email: string | null },
): Promise<TeacherRow | null> {
  if (input.profileId) {
    const { data, error } = await adminClient
      .from('teachers')
      .select('*')
      .eq('establishment_id', input.establishmentId)
      .eq('profile_id', input.profileId)
      .maybeSingle()
    if (error) throw new Error(`Recherche professeur par profil impossible: ${error.message}`)
    if (data) return data as unknown as TeacherRow
  }
  if (input.email) {
    const { data, error } = await adminClient
      .from('teachers')
      .select('*')
      .eq('establishment_id', input.establishmentId)
      .eq('email', input.email)
      .maybeSingle()
    if (error) throw new Error(`Recherche professeur par email impossible: ${error.message}`)
    return (data as unknown as TeacherRow | null) ?? null
  }
  return null
}

function rowToUpdate(row: TeacherImportRow): TeacherUpdateInput {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    discipline: row.discipline ?? null,
  }
}

function readRequiredString(value: unknown, label: string): string {
  const next = clean(value)
  if (!next) throw new Error(`${label} manquante.`)
  return next
}

function requiredOrUndefined(value: unknown, label: string): string {
  const next = clean(value)
  if (!next) throw new Error(`${label} obligatoire.`)
  return next
}

function nullableText(value: unknown): string | null {
  const next = clean(value)
  return next || null
}

function normalizeEmailNullable(value: unknown): string | null {
  const next = clean(value).toLowerCase()
  if (!next) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) throw new Error('Email professeur invalide.')
  return next
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
