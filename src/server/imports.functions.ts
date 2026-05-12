import { createServerFn } from '@tanstack/react-start'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ClassRow, Json, ProfileRow, StudentRow, UserRole } from '@/lib/database.types'
import type { SiecleClass, SiecleStudent } from '@/services/imports/siecle'

declare const process: {
  env: Record<string, string | undefined>
}

export interface ImportSiecleInput {
  accessToken: string
  establishmentId: string
  classes: SiecleClass[]
  students: SiecleStudent[]
  selectedDivisions: string[]
  dryRun: boolean
}

export interface ImportSiecleResult {
  classesCreated: number
  classesReused: number
  studentsCreated: number
  studentsSkipped: number
  errors: string[]
  dryRun: boolean
}

interface CallerProfile extends ProfileRow {}

interface ClassPlan {
  source: SiecleClass
  existing: ClassRow | null
}

interface PreparedImport {
  classes: ClassPlan[]
  students: SiecleStudent[]
  existingStudentsByClass: Map<string, Set<string>>
  errors: string[]
}

type AdminClient = SupabaseClient

const IMPORT_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']

export const importSiecleData = createServerFn({ method: 'POST' })
  .inputValidator(validateImportSiecleInput)
  .handler(async ({ data }): Promise<ImportSiecleResult> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    assertImportPermission(caller, data.establishmentId)

    const prepared = await prepareImport(adminClient, data)
    if (data.dryRun) {
      return computeDryRun(prepared)
    }

    const committed = await commitImport(adminClient, data.establishmentId, prepared)
    await insertAuditLog(adminClient, {
      caller,
      establishmentId: data.establishmentId,
      action: 'import.siecle.students',
      description: `Import SIECLE: ${committed.studentsCreated} eleves importes`,
      metadata: {
        classes_created: committed.classesCreated,
        classes_reused: committed.classesReused,
        students_created: committed.studentsCreated,
        students_skipped: committed.studentsSkipped,
        selected_divisions: data.selectedDivisions,
        source: 'server.imports.siecle',
      },
    })

    return committed
  })

function validateImportSiecleInput(raw: unknown): ImportSiecleInput {
  const data = raw as Partial<ImportSiecleInput>
  const accessToken = clean(data.accessToken)
  const establishmentId = clean(data.establishmentId)
  const selectedDivisions = Array.isArray(data.selectedDivisions)
    ? data.selectedDivisions.map(clean).filter(Boolean)
    : []
  const classes = Array.isArray(data.classes)
    ? data.classes.map(validateClass).filter(isSiecleClass)
    : []
  const students = Array.isArray(data.students)
    ? data.students.map(validateStudent).filter(isSiecleStudent)
    : []
  const dryRun = data.dryRun === true

  if (!accessToken) throw new Error('Session manquante.')
  if (!isUuid(establishmentId)) throw new Error('Etablissement invalide.')
  if (selectedDivisions.length === 0) throw new Error('Selectionnez au moins une division.')
  if (classes.length === 0) throw new Error('Aucune classe SIECLE detectee.')
  if (students.length === 0) throw new Error('Aucun eleve SIECLE detecte.')

  return {
    accessToken,
    establishmentId,
    classes,
    students,
    selectedDivisions,
    dryRun,
  }
}

function validateClass(raw: unknown): SiecleClass | null {
  const data = raw as Partial<SiecleClass>
  const name = clean(data.name)
  if (!name) return null
  return {
    name,
    level: clean(data.level) || extractLevel(name),
    formation: clean(data.formation) || 'Formation non renseignee',
  }
}

function validateStudent(raw: unknown): SiecleStudent | null {
  const data = raw as Partial<SiecleStudent>
  const firstName = clean(data.firstName)
  const lastName = clean(data.lastName)
  const divisionName = clean(data.divisionName)
  if (!firstName || !lastName || !divisionName) return null
  return {
    firstName,
    lastName,
    divisionName,
    formation: clean(data.formation) || null,
    email: normalizeEmail(data.email),
  }
}

function isSiecleClass(value: SiecleClass | null): value is SiecleClass {
  return value !== null
}

function isSiecleStudent(value: SiecleStudent | null): value is SiecleStudent {
  return value !== null
}

function createAdminClient(): AdminClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL manquant cote serveur.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant cote serveur Vercel.')

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function getCallerProfile(adminClient: AdminClient, accessToken: string): Promise<CallerProfile> {
  const { data: userResult, error: userError } = await adminClient.auth.getUser(accessToken)
  const caller = userResult.user
  if (userError || !caller) throw new Error('Session invalide. Reconnectez-vous.')

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .maybeSingle()
  if (error) throw new Error(`Lecture profil appelant impossible: ${error.message}`)
  if (!profile) throw new Error('Profil appelant introuvable.')
  return profile as unknown as CallerProfile
}

function assertImportPermission(caller: CallerProfile, establishmentId: string): void {
  if (!IMPORT_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: import reserve aux admins, DDFPT et superadmin.')
  }
  if (caller.role === 'superadmin') return
  if (caller.establishment_id !== establishmentId) {
    throw new Error('Acces refuse: vous ne pouvez importer que dans votre etablissement.')
  }
}

async function prepareImport(
  adminClient: AdminClient,
  input: ImportSiecleInput,
): Promise<PreparedImport> {
  const selected = new Set(input.selectedDivisions.map(normalizeKey))
  const selectedClasses = input.classes.filter((klass) => selected.has(normalizeKey(klass.name)))
  const selectedStudents = input.students.filter((student) =>
    selected.has(normalizeKey(student.divisionName)),
  )

  const { data: existingClassesData, error: classesError } = await adminClient
    .from('classes')
    .select('*')
    .eq('establishment_id', input.establishmentId)
  if (classesError) throw new Error(`Lecture classes impossible: ${classesError.message}`)

  const existingClasses = ((existingClassesData ?? []) as unknown as ClassRow[])
  const existingClassByName = new Map(
    existingClasses.map((klass) => [normalizeKey(klass.name), klass]),
  )

  const classPlans = selectedClasses.map((source) => ({
    source,
    existing: existingClassByName.get(normalizeKey(source.name)) ?? null,
  }))

  const existingClassIds = classPlans
    .map((plan) => plan.existing?.id)
    .filter(Boolean) as string[]
  const existingStudentsByClass = await fetchExistingStudentsByClass(adminClient, existingClassIds)

  return {
    classes: classPlans,
    students: selectedStudents,
    existingStudentsByClass,
    errors: [],
  }
}

function computeDryRun(prepared: PreparedImport): ImportSiecleResult {
  const classIdByDivision = new Map(
    prepared.classes
      .filter((plan) => plan.existing)
      .map((plan) => [normalizeKey(plan.source.name), plan.existing?.id ?? '']),
  )
  const seenInBatch = new Set<string>()
  let studentsCreated = 0
  let studentsSkipped = 0

  for (const student of prepared.students) {
    const existingClassId = classIdByDivision.get(normalizeKey(student.divisionName))
    const duplicateKey = existingClassId
      ? studentKey(student, existingClassId)
      : normalizeKey(`${student.lastName}|${student.firstName}|${student.divisionName}`)

    if (seenInBatch.has(duplicateKey)) {
      studentsSkipped += 1
      continue
    }
    seenInBatch.add(duplicateKey)

    if (
      existingClassId &&
      prepared.existingStudentsByClass.get(existingClassId)?.has(studentKey(student, existingClassId))
    ) {
      studentsSkipped += 1
    } else {
      studentsCreated += 1
    }
  }

  return {
    classesCreated: prepared.classes.filter((plan) => !plan.existing).length,
    classesReused: prepared.classes.filter((plan) => plan.existing).length,
    studentsCreated,
    studentsSkipped,
    errors: prepared.errors,
    dryRun: true,
  }
}

async function commitImport(
  adminClient: AdminClient,
  establishmentId: string,
  prepared: PreparedImport,
): Promise<ImportSiecleResult> {
  const schoolYear = getCurrentSchoolYear()
  const classIdByDivision = new Map<string, string>()
  let classesCreated = 0
  let classesReused = 0
  const errors = [...prepared.errors]

  for (const plan of prepared.classes) {
    if (plan.existing) {
      classIdByDivision.set(normalizeKey(plan.source.name), plan.existing.id)
      classesReused += 1
      continue
    }

    const { data, error } = await adminClient
      .from('classes')
      .insert({
        establishment_id: establishmentId,
        name: plan.source.name,
        level: plan.source.level || extractLevel(plan.source.name),
        formation: plan.source.formation,
        school_year: schoolYear,
      })
      .select('*')
      .single()
    if (error) {
      errors.push(`Classe ${plan.source.name}: ${error.message}`)
      continue
    }
    const created = data as unknown as ClassRow
    classIdByDivision.set(normalizeKey(plan.source.name), created.id)
    prepared.existingStudentsByClass.set(created.id, new Set())
    classesCreated += 1
  }

  const rowsToInsert: Array<{
    establishment_id: string
    class_id: string
    first_name: string
    last_name: string
    email: string | null
    formation: string | null
  }> = []
  let studentsSkipped = 0
  const seenInBatch = new Set<string>()

  for (const student of prepared.students) {
    const classId = classIdByDivision.get(normalizeKey(student.divisionName))
    if (!classId) {
      errors.push(`Classe introuvable apres creation: ${student.divisionName}`)
      studentsSkipped += 1
      continue
    }
    const key = studentKey(student, classId)
    if (seenInBatch.has(key) || prepared.existingStudentsByClass.get(classId)?.has(key)) {
      studentsSkipped += 1
      continue
    }
    seenInBatch.add(key)
    rowsToInsert.push({
      establishment_id: establishmentId,
      class_id: classId,
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email,
      formation: student.formation,
    })
  }

  if (rowsToInsert.length > 0) {
    const { error } = await adminClient.from('students').insert(rowsToInsert)
    if (error) throw new Error(`Insertion eleves impossible: ${error.message}`)
  }

  return {
    classesCreated,
    classesReused,
    studentsCreated: rowsToInsert.length,
    studentsSkipped,
    errors,
    dryRun: false,
  }
}

async function fetchExistingStudentsByClass(
  adminClient: AdminClient,
  classIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  classIds.forEach((id) => map.set(id, new Set()))
  if (classIds.length === 0) return map

  const { data, error } = await adminClient
    .from('students')
    .select('*')
    .in('class_id', classIds)
    .is('archived_at', null)
  if (error) throw new Error(`Lecture doublons eleves impossible: ${error.message}`)

  for (const student of ((data ?? []) as unknown as StudentRow[])) {
    if (!student.class_id) continue
    const list = map.get(student.class_id) ?? new Set<string>()
    list.add(studentKey(student, student.class_id))
    map.set(student.class_id, list)
  }
  return map
}

async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    caller: CallerProfile
    establishmentId: string
    action: string
    description: string
    metadata: Json
  },
): Promise<void> {
  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: input.caller.id,
    action: input.action,
    description: input.description,
    metadata: input.metadata,
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}

function studentKey(
  student: Pick<SiecleStudent, 'firstName' | 'lastName'> | Pick<StudentRow, 'first_name' | 'last_name'>,
  classId: string,
): string {
  const firstName = 'firstName' in student ? student.firstName : student.first_name
  const lastName = 'lastName' in student ? student.lastName : student.last_name
  return normalizeKey(`${lastName}|${firstName}|${classId}`)
}

function getCurrentSchoolYear(reference = new Date()): string {
  const year = reference.getFullYear()
  const month = reference.getMonth() + 1
  const start = month >= 8 ? year : year - 1
  return `${start}-${start + 1}`
}

function extractLevel(divisionName: string): string {
  const normalized = divisionName.trim().toUpperCase()
  if (/^CAP\s*1|^CAP1/.test(normalized)) return 'CAP 1'
  if (/^CAP\s*2|^CAP2/.test(normalized)) return 'CAP 2'
  const match = normalized.match(/^([123])\s*/)
  return match?.[1] ?? 'N/C'
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeEmail(value: unknown): string | null {
  const email = clean(value).toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
