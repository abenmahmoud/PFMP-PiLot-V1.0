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
} from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

interface TenantScopedInput {
  accessToken: string
  establishmentId?: string | null
}

export interface TenantStudentsAndClasses {
  students: StudentRow[]
  classes: ClassRow[]
}

export interface LinkageIssue {
  severity: 'error' | 'warning'
  relation: string
  entity: string
  entityId: string | null
  message: string
}

export interface TenantLinkageAuditResult {
  establishmentId: string
  checkedAt: string
  summary: {
    errors: number
    warnings: number
    classes: number
    students: number
    periods: number
    placements: number
    companies: number
    tutors: number
    teachers: number
  }
  issues: LinkageIssue[]
}

const READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'referent', 'superadmin']
const AUDIT_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']

export const listTenantStudentsAndClasses = createServerFn({ method: 'POST' })
  .inputValidator(validateTenantScopedInput)
  .handler(async ({ data }): Promise<TenantStudentsAndClasses> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertRole(caller, READ_ROLES, 'lire les eleves et classes')
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      if (caller.role === 'principal') {
        return listPrincipalScope(adminClient, caller, establishmentId)
      }
      if (caller.role === 'referent') {
        return listReferentScope(adminClient, caller, establishmentId)
      }
      return listFullTenantScope(adminClient, establishmentId)
    })
  })

export const auditTenantLinkages = createServerFn({ method: 'POST' })
  .inputValidator(validateTenantScopedInput)
  .handler(async ({ data }): Promise<TenantLinkageAuditResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertRole(caller, AUDIT_ROLES, 'auditer les liaisons metier')
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      const [classes, students, periods, placements, companies, tutors, teachers, profiles] = await Promise.all([
        fetchRows<ClassRow>(adminClient, 'classes', establishmentId),
        fetchRows<StudentRow>(adminClient, 'students', establishmentId),
        fetchRows<PfmpPeriodRow>(adminClient, 'pfmp_periods', establishmentId),
        fetchRows<PlacementRow>(adminClient, 'placements', establishmentId),
        fetchRows<CompanyRow>(adminClient, 'companies', establishmentId),
        fetchRows<TutorRow>(adminClient, 'tutors', establishmentId),
        fetchRows<TeacherRow>(adminClient, 'teachers', establishmentId),
        fetchRows<ProfileRow>(adminClient, 'profiles', establishmentId),
      ])

      const issues: LinkageIssue[] = []
      const classById = indexById(classes)
      const studentById = indexById(students)
      const periodById = indexById(periods)
      const companyById = indexById(companies)
      const tutorById = indexById(tutors)
      const teacherById = indexById(teachers)
      const teacherByProfileId = indexByProfileId(teachers)
      const profileById = indexById(profiles)

      for (const teacher of teachers) {
        if (!teacher.profile_id) continue
        const profile = profileById.get(teacher.profile_id)
        if (!profile) {
          addIssue(issues, 'error', 'teacher.profile_id', 'teacher', teacher.id, 'Le professeur pointe vers un profil introuvable.')
        } else if (profile.establishment_id !== establishmentId) {
          addIssue(issues, 'error', 'teacher.profile_id', 'teacher', teacher.id, 'Le professeur pointe vers un profil hors etablissement.')
        }
      }

      for (const klass of classes) {
        if (!klass.principal_id) continue
        const principal = profileById.get(klass.principal_id)
        if (!principal) {
          addIssue(issues, 'error', 'class.principal_id', 'class', klass.id, 'La classe a un professeur principal introuvable.')
        } else if (!['principal', 'admin', 'ddfpt'].includes(principal.role)) {
          addIssue(issues, 'warning', 'class.principal_id', 'class', klass.id, 'Le professeur principal n a pas un role attendu.')
        }
      }

      for (const student of students) {
        if (student.class_id && !classById.has(student.class_id)) {
          addIssue(issues, 'error', 'student.class_id', 'student', student.id, 'L eleve pointe vers une classe introuvable dans le tenant.')
        }
        if (student.referent_id) {
          const referent = profileById.get(student.referent_id)
          if (!referent) {
            addIssue(issues, 'error', 'student.referent_id', 'student', student.id, 'L eleve pointe vers un referent profil introuvable.')
          } else if (!['referent', 'principal'].includes(referent.role)) {
            addIssue(issues, 'warning', 'student.referent_id', 'student', student.id, 'Le referent eleve n a pas le role referent ou principal.')
          }
          if (!teacherByProfileId.has(student.referent_id)) {
            addIssue(issues, 'warning', 'student.referent_id', 'student', student.id, 'Le referent profil n a pas de ligne professeur rattachee.')
          }
        }
      }

      for (const period of periods) {
        if (period.class_id && !classById.has(period.class_id)) {
          addIssue(issues, 'error', 'pfmp_period.class_id', 'pfmp_period', period.id, 'La periode pointe vers une classe introuvable.')
        }
      }

      for (const tutor of tutors) {
        if (!companyById.has(tutor.company_id)) {
          addIssue(issues, 'error', 'tutor.company_id', 'tutor', tutor.id, 'Le tuteur pointe vers une entreprise introuvable.')
        }
      }

      for (const placement of placements) {
        const student = studentById.get(placement.student_id)
        const period = periodById.get(placement.period_id)
        const company = placement.company_id ? companyById.get(placement.company_id) ?? null : null
        const tutor = placement.tutor_id ? tutorById.get(placement.tutor_id) ?? null : null

        if (!student) {
          addIssue(issues, 'error', 'placement.student_id', 'placement', placement.id, 'Le placement pointe vers un eleve introuvable.')
        }
        if (!period) {
          addIssue(issues, 'error', 'placement.period_id', 'placement', placement.id, 'Le placement pointe vers une periode introuvable.')
        }
        if (placement.company_id && !company) {
          addIssue(issues, 'error', 'placement.company_id', 'placement', placement.id, 'Le placement pointe vers une entreprise introuvable.')
        }
        if (placement.tutor_id && !tutor) {
          addIssue(issues, 'error', 'placement.tutor_id', 'placement', placement.id, 'Le placement pointe vers un tuteur introuvable.')
        }
        if (company && tutor && tutor.company_id !== company.id) {
          addIssue(issues, 'error', 'placement.tutor_id', 'placement', placement.id, 'Le tuteur du placement ne depend pas de l entreprise choisie.')
        }
        if (student && period?.class_id && student.class_id !== period.class_id) {
          addIssue(issues, 'warning', 'placement.student_id+period_id', 'placement', placement.id, 'L eleve n appartient pas a la classe de la periode.')
        }
        if (placement.referent_id) {
          const referentTeacher = teacherById.get(placement.referent_id)
          const referentProfile = profileById.get(placement.referent_id)
          if (!referentTeacher && !referentProfile) {
            addIssue(issues, 'error', 'placement.referent_id', 'placement', placement.id, 'Le placement pointe vers un referent introuvable.')
          }
          if (referentTeacher?.profile_id && student?.referent_id && referentTeacher.profile_id !== student.referent_id) {
            addIssue(issues, 'warning', 'placement.referent_id', 'placement', placement.id, 'Le referent du placement differe du referent affecte a l eleve.')
          }
        }
      }

      const errors = issues.filter((issue) => issue.severity === 'error').length
      return {
        establishmentId,
        checkedAt: new Date().toISOString(),
        summary: {
          errors,
          warnings: issues.length - errors,
          classes: classes.length,
          students: students.length,
          periods: periods.length,
          placements: placements.length,
          companies: companies.length,
          tutors: tutors.length,
          teachers: teachers.length,
        },
        issues,
      }
    })
  })

function validateTenantScopedInput(raw: unknown): TenantScopedInput {
  const data = raw as Partial<TenantScopedInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    establishmentId: data.establishmentId ? validateUuid(data.establishmentId, 'Etablissement') : null,
  }
}

async function listFullTenantScope(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<TenantStudentsAndClasses> {
  const [classes, students] = await Promise.all([
    fetchRows<ClassRow>(adminClient, 'classes', establishmentId, 'name'),
    fetchRows<StudentRow>(adminClient, 'students', establishmentId, 'last_name', true),
  ])
  return { classes, students }
}

async function listPrincipalScope(
  adminClient: AdminClient,
  caller: ProfileRow,
  establishmentId: string,
): Promise<TenantStudentsAndClasses> {
  const { data: classRows, error: classError } = await adminClient
    .from('classes')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('principal_id', caller.id)
    .order('name')
  if (classError) throw new Error(`Lecture classes impossible: ${classError.message}`)
  const classes = (classRows as unknown as ClassRow[]) ?? []
  if (classes.length === 0) return { classes: [], students: [] }
  const classIds = classes.map((klass) => klass.id)
  const { data: studentRows, error: studentError } = await adminClient
    .from('students')
    .select('*')
    .eq('establishment_id', establishmentId)
    .is('archived_at', null)
    .in('class_id', classIds)
    .order('last_name')
    .order('first_name')
  if (studentError) throw new Error(`Lecture eleves impossible: ${studentError.message}`)
  return { classes, students: (studentRows as unknown as StudentRow[]) ?? [] }
}

async function listReferentScope(
  adminClient: AdminClient,
  caller: ProfileRow,
  establishmentId: string,
): Promise<TenantStudentsAndClasses> {
  const { data: studentRows, error: studentError } = await adminClient
    .from('students')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('referent_id', caller.id)
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')
  if (studentError) throw new Error(`Lecture eleves impossible: ${studentError.message}`)
  const students = (studentRows as unknown as StudentRow[]) ?? []
  const classIds = unique(students.map((student) => student.class_id))
  if (classIds.length === 0) return { classes: [], students }
  const { data: classRows, error: classError } = await adminClient
    .from('classes')
    .select('*')
    .eq('establishment_id', establishmentId)
    .in('id', classIds)
    .order('name')
  if (classError) throw new Error(`Lecture classes impossible: ${classError.message}`)
  return { classes: (classRows as unknown as ClassRow[]) ?? [], students }
}

async function fetchRows<T>(
  adminClient: AdminClient,
  table: string,
  establishmentId: string,
  orderBy = 'created_at',
  activeOnly = false,
): Promise<T[]> {
  let query = adminClient.from(table).select('*').eq('establishment_id', establishmentId)
  if (activeOnly) query = query.is('archived_at', null)
  const { data, error } = await query.order(orderBy)
  if (error) throw new Error(`Lecture ${table} impossible: ${error.message}`)
  return ((data as unknown as T[]) ?? [])
}

function resolveEstablishmentId(caller: ProfileRow, requested: string | null | undefined): string {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ?? caller.establishment_id
    if (!establishmentId) throw new Error('Etablissement actif requis.')
    return establishmentId
  }
  if (!caller.establishment_id) throw new Error('Profil sans etablissement.')
  if (requested && requested !== caller.establishment_id) {
    throw new Error('Acces refuse: etablissement hors perimetre.')
  }
  return caller.establishment_id
}

function assertRole(caller: ProfileRow, allowed: UserRole[], action: string): void {
  if (!allowed.includes(caller.role)) {
    throw new Error(`Acces refuse: vous ne pouvez pas ${action}.`)
  }
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function indexByProfileId(items: TeacherRow[]): Map<string, TeacherRow> {
  return new Map(items.filter((item) => item.profile_id).map((item) => [item.profile_id as string, item]))
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function addIssue(
  issues: LinkageIssue[],
  severity: LinkageIssue['severity'],
  relation: string,
  entity: string,
  entityId: string | null,
  message: string,
): void {
  issues.push({ severity, relation, entity, entityId, message })
}

function readRequiredString(value: unknown, label: string): string {
  const next = clean(value)
  if (!next) throw new Error(`${label} manquante.`)
  return next
}
