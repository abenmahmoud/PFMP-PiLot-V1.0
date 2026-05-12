import { createHash, randomBytes } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  ClassRow,
  Json,
  ProfileRow,
  StudentAccessCodeRow,
  StudentRow,
  UserRole,
} from '@/lib/database.types'

declare const process: {
  env: Record<string, string | undefined>
}

export interface ClassStudentAccessInput {
  accessToken: string
  classId: string
}

export interface GenerateClassStudentAccessInput extends ClassStudentAccessInput {
  mode: 'missing' | 'all'
}

export interface SingleStudentAccessInput extends ClassStudentAccessInput {
  studentId: string
}

export interface StudentAccessStatus {
  id: string
  student_id: string
  code_hint: string
  status: StudentAccessCodeRow['status']
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface ClassStudentAccessRow {
  student: StudentRow
  accessCode: StudentAccessStatus | null
}

export interface ClassStudentAccessResult {
  class: ClassRow
  students: ClassStudentAccessRow[]
}

export interface GeneratedStudentCode {
  studentId: string
  firstName: string
  lastName: string
  className: string
  code: string
  codeHint: string
  qrPayload: string
}

export interface GenerateStudentCodesResult {
  generatedCodes: GeneratedStudentCode[]
  skippedCount: number
  revokedCount: number
}

interface CallerProfile extends ProfileRow {}

type AdminClient = SupabaseClient

const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'superadmin']
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const listClassStudentAccess = createServerFn({ method: 'POST' })
  .inputValidator(validateClassInput)
  .handler(async ({ data }): Promise<ClassStudentAccessResult> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const context = await loadClassContext(adminClient, data.classId)
    assertClassManagePermission(caller, context.class)
    return buildClassStudentAccessResult(context.class, context.students, context.codes)
  })

export const generateClassStudentAccessCodes = createServerFn({ method: 'POST' })
  .inputValidator(validateGenerateClassInput)
  .handler(async ({ data }): Promise<GenerateStudentCodesResult> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const context = await loadClassContext(adminClient, data.classId)
    assertClassManagePermission(caller, context.class)

    const activeByStudent = activeCodeByStudent(context.codes)
    const targetStudents =
      data.mode === 'all'
        ? context.students
        : context.students.filter((student) => !activeByStudent.has(student.id))

    const studentIdsToRevoke =
      data.mode === 'all'
        ? context.students.map((student) => student.id).filter((id) => activeByStudent.has(id))
        : []

    const revokedCount = await revokeActiveCodes(adminClient, {
      classId: context.class.id,
      studentIds: studentIdsToRevoke,
    })

    const generatedCodes = await createCodesForStudents(adminClient, {
      caller,
      klass: context.class,
      students: targetStudents,
    })

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: context.class.establishment_id,
      action: 'student_access_codes.class_generated',
      description: `Codes eleves generes pour ${context.class.name}`,
      metadata: {
        class_id: context.class.id,
        class_name: context.class.name,
        mode: data.mode,
        generated_count: generatedCodes.length,
        revoked_count: revokedCount,
        source: 'server.student_access_codes',
      },
    })

    return {
      generatedCodes,
      skippedCount: data.mode === 'missing' ? context.students.length - generatedCodes.length : 0,
      revokedCount,
    }
  })

export const generateSingleStudentAccessCode = createServerFn({ method: 'POST' })
  .inputValidator(validateSingleStudentInput)
  .handler(async ({ data }): Promise<GenerateStudentCodesResult> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const context = await loadClassContext(adminClient, data.classId)
    assertClassManagePermission(caller, context.class)

    const student = context.students.find((item) => item.id === data.studentId)
    if (!student) throw new Error('Eleve introuvable dans cette classe.')

    const revokedCount = await revokeActiveCodes(adminClient, {
      classId: context.class.id,
      studentIds: [student.id],
    })
    const generatedCodes = await createCodesForStudents(adminClient, {
      caller,
      klass: context.class,
      students: [student],
    })

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: context.class.establishment_id,
      action: 'student_access_codes.student_generated',
      description: `Code eleve regenere pour ${student.first_name} ${student.last_name}`,
      metadata: {
        class_id: context.class.id,
        student_id: student.id,
        revoked_count: revokedCount,
        source: 'server.student_access_codes',
      },
    })

    return { generatedCodes, skippedCount: 0, revokedCount }
  })

export const revokeStudentAccessCode = createServerFn({ method: 'POST' })
  .inputValidator(validateSingleStudentInput)
  .handler(async ({ data }): Promise<{ ok: true; revokedCount: number }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const context = await loadClassContext(adminClient, data.classId)
    assertClassManagePermission(caller, context.class)

    const student = context.students.find((item) => item.id === data.studentId)
    if (!student) throw new Error('Eleve introuvable dans cette classe.')

    const revokedCount = await revokeActiveCodes(adminClient, {
      classId: context.class.id,
      studentIds: [student.id],
    })

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: context.class.establishment_id,
      action: 'student_access_codes.revoked',
      description: `Code eleve revoque pour ${student.first_name} ${student.last_name}`,
      metadata: {
        class_id: context.class.id,
        student_id: student.id,
        revoked_count: revokedCount,
        source: 'server.student_access_codes',
      },
    })

    return { ok: true, revokedCount }
  })

function validateClassInput(raw: unknown): ClassStudentAccessInput {
  const data = raw as Partial<ClassStudentAccessInput>
  const accessToken = clean(data.accessToken)
  const classId = validateUuid(data.classId, 'Classe')
  if (!accessToken) throw new Error('Session manquante.')
  return { accessToken, classId }
}

function validateGenerateClassInput(raw: unknown): GenerateClassStudentAccessInput {
  const base = validateClassInput(raw)
  const data = raw as Partial<GenerateClassStudentAccessInput>
  const mode = data.mode === 'all' ? 'all' : 'missing'
  return { ...base, mode }
}

function validateSingleStudentInput(raw: unknown): SingleStudentAccessInput {
  const base = validateClassInput(raw)
  const data = raw as Partial<SingleStudentAccessInput>
  return { ...base, studentId: validateUuid(data.studentId, 'Eleve') }
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

async function loadClassContext(adminClient: AdminClient, classId: string): Promise<{
  class: ClassRow
  students: StudentRow[]
  codes: StudentAccessCodeRow[]
}> {
  const { data: klass, error: classError } = await adminClient
    .from('classes')
    .select('*')
    .eq('id', classId)
    .maybeSingle()
  if (classError) throw new Error(`Lecture classe impossible: ${classError.message}`)
  if (!klass) throw new Error('Classe introuvable.')

  const classRow = klass as unknown as ClassRow
  const { data: students, error: studentsError } = await adminClient
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')
  if (studentsError) throw new Error(`Lecture eleves impossible: ${studentsError.message}`)

  const studentRows = ((students ?? []) as unknown as StudentRow[])
  const studentIds = studentRows.map((student) => student.id)
  const codes =
    studentIds.length > 0
      ? await fetchCodesForStudents(adminClient, studentIds)
      : []

  return { class: classRow, students: studentRows, codes }
}

async function fetchCodesForStudents(
  adminClient: AdminClient,
  studentIds: string[],
): Promise<StudentAccessCodeRow[]> {
  const { data, error } = await adminClient
    .from('student_access_codes')
    .select('*')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Lecture codes eleves impossible: ${error.message}`)
  return (data ?? []) as unknown as StudentAccessCodeRow[]
}

function assertClassManagePermission(caller: CallerProfile, klass: ClassRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: gestion des codes reservee aux adultes autorises.')
  }
  if (caller.role === 'superadmin') return
  if (!caller.establishment_id || caller.establishment_id !== klass.establishment_id) {
    throw new Error('Acces refuse: classe hors de votre etablissement.')
  }
  if (caller.role === 'principal' && klass.principal_id !== caller.id) {
    throw new Error('Acces refuse: vous ne pouvez gerer que vos classes.')
  }
}

function buildClassStudentAccessResult(
  klass: ClassRow,
  students: StudentRow[],
  codes: StudentAccessCodeRow[],
): ClassStudentAccessResult {
  const latestByStudent = latestCodeByStudent(codes)
  return sanitizeForSeroval({
    class: klass,
    students: students.map((student) => ({
      student,
      accessCode: toAccessStatus(latestByStudent.get(student.id) ?? null),
    })),
  })
}

function sanitizeForSeroval<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value))) as T
}

function latestCodeByStudent(codes: StudentAccessCodeRow[]): Map<string, StudentAccessCodeRow> {
  const map = new Map<string, StudentAccessCodeRow>()
  for (const code of codes) {
    if (!map.has(code.student_id)) map.set(code.student_id, code)
  }
  return map
}

function activeCodeByStudent(codes: StudentAccessCodeRow[]): Map<string, StudentAccessCodeRow> {
  const map = new Map<string, StudentAccessCodeRow>()
  for (const code of codes) {
    if (code.status === 'active' && !map.has(code.student_id)) map.set(code.student_id, code)
  }
  return map
}

function toAccessStatus(code: StudentAccessCodeRow | null): StudentAccessStatus | null {
  if (!code) return null
  return {
    id: code.id,
    student_id: code.student_id,
    code_hint: code.code_hint,
    status: code.status,
    expires_at: code.expires_at,
    last_used_at: code.last_used_at,
    revoked_at: code.revoked_at,
    created_at: code.created_at,
  }
}

async function revokeActiveCodes(
  adminClient: AdminClient,
  input: { classId: string; studentIds: string[] },
): Promise<number> {
  if (input.studentIds.length === 0) return 0
  const revokedAt = new Date().toISOString()
  const { data, error } = await adminClient
    .from('student_access_codes')
    .update({
      status: 'revoked',
      revoked_at: revokedAt,
      updated_at: revokedAt,
    })
    .in('student_id', input.studentIds)
    .eq('status', 'active')
    .select('id')
  if (error) throw new Error(`Revocation codes impossible: ${error.message}`)
  return (data ?? []).length
}

async function createCodesForStudents(
  adminClient: AdminClient,
  input: { caller: CallerProfile; klass: ClassRow; students: StudentRow[] },
): Promise<GeneratedStudentCode[]> {
  const generated = input.students.map((student) => {
    const code = generateReadableCode()
    const codeHint = code.slice(-4)
    return {
      student,
      code,
      codeHint,
      codeHash: hashAccessCode(code),
    }
  })

  if (generated.length === 0) return []

  const rows = generated.map((item) => ({
    establishment_id: input.klass.establishment_id,
    student_id: item.student.id,
    code_hash: item.codeHash,
    code_hint: item.codeHint,
    status: 'active',
    created_by: input.caller.id,
  }))

  const { error } = await adminClient.from('student_access_codes').insert(rows)
  if (error) throw new Error(`Generation codes impossible: ${error.message}`)

  return generated.map((item) => ({
    studentId: item.student.id,
    firstName: item.student.first_name,
    lastName: item.student.last_name,
    className: input.klass.name,
    code: item.code,
    codeHint: item.codeHint,
    qrPayload: `${getAppUrl()}/eleve?code=${encodeURIComponent(item.code)}`,
  }))
}

async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    caller: CallerProfile
    establishmentId: string | null
    action: string
    description: string
    metadata: Json
  },
): Promise<void> {
  const metadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? { ...input.metadata, caller_role: input.caller.role }
      : { value: input.metadata, caller_role: input.caller.role }

  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: input.caller.id,
    action: input.action,
    description: input.description,
    metadata,
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}

function generateReadableCode(): string {
  const bytes = randomBytes(9)
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
  return `PFMP-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`
}

function hashAccessCode(code: string): string {
  const pepper = process.env.STUDENT_ACCESS_CODE_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHash('sha256')
    .update(`${pepper}:${normalizeCode(code)}`)
    .digest('hex')
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function getAppUrl(): string {
  const rawUrl = (
    process.env.PFMP_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    'https://www.pfmp-pilot.fr'
  ).replace(/\/+$/, '')

  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateUuid(value: unknown, label: string): string {
  const uuid = clean(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(uuid)) {
    throw new Error(`${label} invalide.`)
  }
  return uuid
}
