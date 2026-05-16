import { getSupabase } from '@/lib/supabase'
import type {
  AlertRow,
  ClassRow,
  CompanyRow,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StageStatus,
  StudentRow,
  TeacherAssignmentRow,
  TeacherRow,
  TutorRow,
} from '@/lib/database.types'

export interface MyStudentCard {
  studentId: string
  placementId: string | null
  fullName: string
  className: string
  formation: string
  periodLabel: string
  companyName: string | null
  companyCity: string | null
  companyAddress: string | null
  tutorName: string | null
  tutorPhone: string | null
  status: StageStatus
  hasAlert: boolean
  nextAction: string | null
}

export interface MyStudentsFilters {
  classId?: string
  periodId?: string
}

export async function fetchMyStudents(
  profile: ProfileRow,
  filters: MyStudentsFilters = {},
): Promise<MyStudentCard[]> {
  const sb = getSupabase()

  const teacher = await fetchCurrentTeacher(profile.id)
  if (!teacher) return []

  let studentIds: string[] = []
  if (profile.role === 'principal') {
    studentIds = await fetchPrincipalStudentIds(profile.id, filters.classId)
  } else {
    studentIds = await fetchReferentStudentIds(teacher.id, filters.periodId)
  }

  if (studentIds.length === 0) return []

  let studentQuery = sb
    .from('students')
    .select('*')
    .in('id', studentIds)
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')

  if (filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId)

  const { data: studentsData, error: studentsError } = await studentQuery
  if (studentsError) throw new Error(`fetchMyStudents students: ${studentsError.message}`)

  const students = (studentsData as StudentRow[]) ?? []
  if (students.length === 0) return []

  const visibleStudentIds = students.map((student) => student.id)
  const classIds = unique(students.map((student) => student.class_id))

  const [classesResult, placementsResult, alertsResult] = await Promise.all([
    classIds.length > 0
      ? sb.from('classes').select('*').in('id', classIds)
      : Promise.resolve({ data: [], error: null }),
    sb
      .from('placements')
      .select('*')
      .in('student_id', visibleStudentIds)
      .order('created_at', { ascending: false }),
    sb
      .from('alerts')
      .select('*')
      .eq('related_entity_type', 'student')
      .in('related_entity_id', visibleStudentIds)
      .eq('resolved', false)
      .order('created_at', { ascending: false }),
  ])

  if (classesResult.error) throw new Error(`fetchMyStudents classes: ${classesResult.error.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchMyStudents placements: ${placementsResult.error.message}`)
  }
  if (alertsResult.error) throw new Error(`fetchMyStudents alerts: ${alertsResult.error.message}`)

  const placements = ((placementsResult.data as PlacementRow[]) ?? []).filter((placement) => {
    if (filters.periodId && placement.period_id !== filters.periodId) return false
    return true
  })
  const placementByStudentId = latestPlacementByStudent(placements)
  const selectedPlacements = [...placementByStudentId.values()]

  const companyIds = unique(selectedPlacements.map((placement) => placement.company_id))
  const tutorIds = unique(selectedPlacements.map((placement) => placement.tutor_id))
  const periodIds = unique(selectedPlacements.map((placement) => placement.period_id))

  const [companiesResult, tutorsResult, periodsResult] = await Promise.all([
    companyIds.length > 0
      ? sb.from('companies').select('*').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    tutorIds.length > 0
      ? sb.from('tutors').select('*').in('id', tutorIds)
      : Promise.resolve({ data: [], error: null }),
    periodIds.length > 0
      ? sb.from('pfmp_periods').select('*').in('id', periodIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (companiesResult.error) {
    throw new Error(`fetchMyStudents companies: ${companiesResult.error.message}`)
  }
  if (tutorsResult.error) throw new Error(`fetchMyStudents tutors: ${tutorsResult.error.message}`)
  if (periodsResult.error) throw new Error(`fetchMyStudents periods: ${periodsResult.error.message}`)

  const classById = indexById((classesResult.data as ClassRow[]) ?? [])
  const companyById = indexById((companiesResult.data as CompanyRow[]) ?? [])
  const tutorById = indexById((tutorsResult.data as TutorRow[]) ?? [])
  const periodById = indexById((periodsResult.data as PfmpPeriodRow[]) ?? [])
  const alertByStudentId = groupBy((alertsResult.data as AlertRow[]) ?? [], (alert) => alert.related_entity_id ?? '')

  return students
    .map((student) => {
      const placement = placementByStudentId.get(student.id) ?? null
      const company = placement?.company_id ? companyById.get(placement.company_id) ?? null : null
      const tutor = placement?.tutor_id ? tutorById.get(placement.tutor_id) ?? null : null
      const period = placement?.period_id ? periodById.get(placement.period_id) ?? null : null
      const alerts = alertByStudentId.get(student.id) ?? []
      return {
        studentId: student.id,
        placementId: placement?.id ?? null,
        fullName: `${student.first_name} ${student.last_name}`,
        className: student.class_id ? classById.get(student.class_id)?.name ?? 'Classe inconnue' : 'Sans classe',
        formation: student.formation ?? classById.get(student.class_id ?? '')?.formation ?? 'Formation non renseignee',
        periodLabel: period?.name ?? 'Aucune periode',
        companyName: company?.name ?? null,
        companyCity: company?.city ?? null,
        companyAddress: company ? formatCompanyAddress(company) : null,
        tutorName: tutor ? `${tutor.first_name} ${tutor.last_name}` : null,
        tutorPhone: tutor?.phone ?? null,
        status: placement?.status ?? 'no_stage',
        hasAlert: alerts.length > 0,
        nextAction: alerts[0]?.message ?? null,
      }
    })
    .filter((card) => {
      if (filters.periodId && card.periodLabel === 'Aucune periode') return false
      return true
    })
}

export async function fetchMyStudentsFilterOptions(profile: ProfileRow): Promise<{
  classes: Pick<ClassRow, 'id' | 'name'>[]
  periods: Pick<PfmpPeriodRow, 'id' | 'name'>[]
}> {
  const sb = getSupabase()
  const teacher = await fetchCurrentTeacher(profile.id)
  if (!teacher) return { classes: [], periods: [] }

  const [classesResult, periodsResult] = await Promise.all([
    profile.role === 'principal'
      ? sb.from('classes').select('id, name').eq('principal_id', profile.id).order('name')
      : sb.from('classes').select('id, name').order('name'),
    sb.from('pfmp_periods').select('id, name').order('start_date', { ascending: false }),
  ])

  if (classesResult.error) {
    throw new Error(`fetchMyStudentsFilterOptions classes: ${classesResult.error.message}`)
  }
  if (periodsResult.error) {
    throw new Error(`fetchMyStudentsFilterOptions periods: ${periodsResult.error.message}`)
  }

  return {
    classes: (classesResult.data as Pick<ClassRow, 'id' | 'name'>[]) ?? [],
    periods: (periodsResult.data as Pick<PfmpPeriodRow, 'id' | 'name'>[]) ?? [],
  }
}

async function fetchCurrentTeacher(profileId: string): Promise<TeacherRow | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .maybeSingle()

  if (error) throw new Error(`fetchCurrentTeacher: ${error.message}`)
  return (data as TeacherRow | null) ?? null
}

async function fetchReferentStudentIds(teacherId: string, periodId?: string): Promise<string[]> {
  const sb = getSupabase()
  let query = sb
    .from('teacher_assignments')
    .select('*')
    .eq('teacher_id', teacherId)

  if (periodId) query = query.eq('period_id', periodId)

  const { data, error } = await query
  if (error) throw new Error(`fetchReferentStudentIds: ${error.message}`)

  return unique(((data as TeacherAssignmentRow[]) ?? []).map((assignment) => assignment.student_id))
}

async function fetchPrincipalStudentIds(teacherId: string, classId?: string): Promise<string[]> {
  const sb = getSupabase()
  let classQuery = sb.from('classes').select('*').eq('principal_id', teacherId)
  if (classId) classQuery = classQuery.eq('id', classId)

  const { data: classes, error: classesError } = await classQuery
  if (classesError) throw new Error(`fetchPrincipalStudentIds classes: ${classesError.message}`)

  const classIds = ((classes as ClassRow[]) ?? []).map((row) => row.id)
  if (classIds.length === 0) return []

  const { data: students, error: studentsError } = await sb
    .from('students')
    .select('id')
    .in('class_id', classIds)
    .is('archived_at', null)

  if (studentsError) throw new Error(`fetchPrincipalStudentIds students: ${studentsError.message}`)
  return ((students as Array<{ id: string }>) ?? []).map((student) => student.id)
}

function latestPlacementByStudent(placements: PlacementRow[]): Map<string, PlacementRow> {
  const map = new Map<string, PlacementRow>()
  for (const placement of placements) {
    if (!map.has(placement.student_id)) {
      map.set(placement.student_id, placement)
    }
  }
  return map
}

function formatCompanyAddress(company: CompanyRow): string | null {
  const parts = [company.address, company.zip_code, company.city].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
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
