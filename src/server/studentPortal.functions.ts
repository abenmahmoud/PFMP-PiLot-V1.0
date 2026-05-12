import { createHash } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  ClassRow,
  CompanyRow,
  EstablishmentRow,
  Json,
  PlacementRow,
  StudentAccessCodeRow,
  StudentRow,
  TutorRow,
} from '@/lib/database.types'

declare const process: {
  env: Record<string, string | undefined>
}

export type StudentCodeError = 'CODE_INVALID' | 'CODE_REVOKED' | 'CODE_EXPIRED'

export interface StudentPublicSession {
  studentId: string
  firstName: string
  lastName: string
  className: string
  classId: string
  establishmentName: string
  validatedAt: string
}

export type ValidateStudentCodeResult =
  | { ok: true; session: StudentPublicSession }
  | { ok: false; error: StudentCodeError }

export interface StudentPublicDashboard {
  student: {
    id: string
    firstName: string
    lastName: string
    formation: string | null
    email: string | null
    phone: string | null
  }
  class: { id: string; name: string; level: string } | null
  placement: {
    status: string
    startDate: string | null
    endDate: string | null
  } | null
  company: {
    name: string
    address: string | null
    city: string | null
    zipCode: string | null
  } | null
  tutor: {
    firstName: string
    lastName: string
    function: string | null
    phone: string | null
  } | null
}

interface ValidateStudentCodeInput {
  code: string
}

interface StudentDashboardInput {
  studentId: string
}

type AdminClient = SupabaseClient

export const validateStudentCode = createServerFn({ method: 'POST' })
  .inputValidator(validateStudentCodeInput)
  .handler(async ({ data }): Promise<ValidateStudentCodeResult> => {
    const code = normalizeCode(data.code)
    if (!code) return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })

    const adminClient = createAdminClient()
    const codeRow = await findAccessCodeByHash(adminClient, hashAccessCode(code))
    if (!codeRow) return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })

    const inactiveError = getInactiveCodeError(codeRow)
    if (inactiveError) return sanitizeForSeroval({ ok: false, error: inactiveError })

    const student = await fetchStudent(adminClient, codeRow.student_id)
    if (!student || student.archived_at) {
      return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })
    }

    const [klass, establishment] = await Promise.all([
      student.class_id ? fetchClass(adminClient, student.class_id) : Promise.resolve(null),
      fetchEstablishment(adminClient, student.establishment_id),
    ])

    const validatedAt = new Date().toISOString()
    await markCodeUsed(adminClient, codeRow.id, validatedAt)
    await insertAuditLog(adminClient, {
      establishmentId: student.establishment_id,
      action: 'student_portal.code_validated',
      description: `Code eleve valide pour ${student.first_name} ${student.last_name}`,
      metadata: {
        student_id: student.id,
        class_id: klass?.id ?? null,
        code_hint: codeRow.code_hint,
        source: 'server.student_portal',
      },
    })

    return sanitizeForSeroval({
      ok: true,
      session: {
        studentId: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        className: klass?.name ?? 'Classe non renseignee',
        classId: klass?.id ?? '',
        establishmentName: establishment?.name ?? 'Etablissement',
        validatedAt,
      },
    })
  })

export const getStudentPublicDashboard = createServerFn({ method: 'POST' })
  .inputValidator(validateStudentDashboardInput)
  .handler(async ({ data }): Promise<StudentPublicDashboard | null> => {
    const adminClient = createAdminClient()
    const code = await findActiveCodeForStudent(adminClient, data.studentId)
    if (!code || getInactiveCodeError(code)) return sanitizeForSeroval(null)

    const student = await fetchStudent(adminClient, data.studentId)
    if (!student || student.archived_at) return sanitizeForSeroval(null)

    const [klass, placement] = await Promise.all([
      student.class_id ? fetchClass(adminClient, student.class_id) : Promise.resolve(null),
      fetchLatestPlacement(adminClient, student.id),
    ])

    const [company, tutor] = await Promise.all([
      placement?.company_id ? fetchCompany(adminClient, placement.company_id) : Promise.resolve(null),
      placement?.tutor_id ? fetchTutor(adminClient, placement.tutor_id) : Promise.resolve(null),
    ])

    return sanitizeForSeroval({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        formation: student.formation,
        email: student.email,
        phone: student.phone,
      },
      class: klass
        ? {
            id: klass.id,
            name: klass.name,
            level: klass.level,
          }
        : null,
      placement: placement
        ? {
            status: placement.status,
            startDate: placement.start_date,
            endDate: placement.end_date,
          }
        : null,
      company: company
        ? {
            name: company.name,
            address: company.address,
            city: company.city,
            zipCode: company.zip_code,
          }
        : null,
      tutor: tutor
        ? {
            firstName: tutor.first_name,
            lastName: tutor.last_name,
            function: tutor.function,
            phone: tutor.phone,
          }
        : null,
    })
  })

function validateStudentCodeInput(raw: unknown): ValidateStudentCodeInput {
  const data = raw as Partial<ValidateStudentCodeInput>
  return { code: typeof data.code === 'string' ? data.code : '' }
}

function validateStudentDashboardInput(raw: unknown): StudentDashboardInput {
  const data = raw as Partial<StudentDashboardInput>
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : ''
  if (!isUuid(studentId)) throw new Error('Eleve invalide.')
  return { studentId }
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

async function findAccessCodeByHash(
  adminClient: AdminClient,
  codeHash: string,
): Promise<StudentAccessCodeRow | null> {
  const { data, error } = await adminClient
    .from('student_access_codes')
    .select('*')
    .eq('code_hash', codeHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Verification code eleve impossible: ${error.message}`)
  return (data as unknown as StudentAccessCodeRow | null) ?? null
}

async function findActiveCodeForStudent(
  adminClient: AdminClient,
  studentId: string,
): Promise<StudentAccessCodeRow | null> {
  const { data, error } = await adminClient
    .from('student_access_codes')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture code eleve impossible: ${error.message}`)
  return (data as unknown as StudentAccessCodeRow | null) ?? null
}

async function fetchStudent(adminClient: AdminClient, studentId: string): Promise<StudentRow | null> {
  const { data, error } = await adminClient
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture eleve impossible: ${error.message}`)
  return (data as unknown as StudentRow | null) ?? null
}

async function fetchClass(adminClient: AdminClient, classId: string): Promise<ClassRow | null> {
  const { data, error } = await adminClient
    .from('classes')
    .select('*')
    .eq('id', classId)
    .maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  return (data as unknown as ClassRow | null) ?? null
}

async function fetchEstablishment(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<EstablishmentRow | null> {
  const { data, error } = await adminClient
    .from('establishments')
    .select('*')
    .eq('id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture etablissement impossible: ${error.message}`)
  return (data as unknown as EstablishmentRow | null) ?? null
}

async function fetchLatestPlacement(
  adminClient: AdminClient,
  studentId: string,
): Promise<PlacementRow | null> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture stage impossible: ${error.message}`)
  return (data as unknown as PlacementRow | null) ?? null
}

async function fetchCompany(adminClient: AdminClient, companyId: string): Promise<CompanyRow | null> {
  const { data, error } = await adminClient
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle()
  if (error) throw new Error(`Lecture entreprise impossible: ${error.message}`)
  return (data as unknown as CompanyRow | null) ?? null
}

async function fetchTutor(adminClient: AdminClient, tutorId: string): Promise<TutorRow | null> {
  const { data, error } = await adminClient
    .from('tutors')
    .select('*')
    .eq('id', tutorId)
    .maybeSingle()
  if (error) throw new Error(`Lecture tuteur impossible: ${error.message}`)
  return (data as unknown as TutorRow | null) ?? null
}

async function markCodeUsed(
  adminClient: AdminClient,
  codeId: string,
  usedAt: string,
): Promise<void> {
  const { error } = await adminClient
    .from('student_access_codes')
    .update({ last_used_at: usedAt, updated_at: usedAt })
    .eq('id', codeId)
  if (error) throw new Error(`Mise a jour code eleve impossible: ${error.message}`)
}

async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    establishmentId: string | null
    action: string
    description: string
    metadata: Json
  },
): Promise<void> {
  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: null,
    action: input.action,
    description: input.description,
    metadata: input.metadata,
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}

function getInactiveCodeError(code: StudentAccessCodeRow): StudentCodeError | null {
  if (code.status === 'revoked') return 'CODE_REVOKED'
  if (code.status === 'expired') return 'CODE_EXPIRED'
  if (code.expires_at && new Date(code.expires_at).getTime() <= Date.now()) return 'CODE_EXPIRED'
  if (code.status !== 'active') return 'CODE_INVALID'
  return null
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

function sanitizeForSeroval<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value))) as T
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}
