import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type {
  ClassRow,
  CompanyRow,
  PfmpPeriodRow,
  PlacementRow,
  StudentRow,
  TeacherAssignmentRow,
  TeacherRow,
} from '@/lib/database.types'

export interface AssignmentFilters {
  classId?: string
  periodId?: string
}

export interface AssignmentListItem {
  student: StudentRow
  class: ClassRow | null
  period: PfmpPeriodRow | null
  placement: PlacementRow | null
  company: CompanyRow | null
  referent: TeacherRow | null
}

export interface TeacherLoadItem {
  teacher: TeacherRow
  studentLoad: number
}

export interface AssignmentOptions {
  classes: ClassRow[]
  periods: PfmpPeriodRow[]
}

export async function fetchAssignments(filters: AssignmentFilters = {}): Promise<AssignmentListItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let studentQuery = sb
    .from('students')
    .select('*')
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')

  if (scope) studentQuery = studentQuery.eq('establishment_id', scope)
  if (filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId)

  const { data, error } = await studentQuery
  if (error) throw new Error(`fetchAssignments students: ${error.message}`)

  const students = (data as StudentRow[]) ?? []
  if (students.length === 0) return []

  const studentIds = students.map((student) => student.id)
  const classIds = unique(students.map((student) => student.class_id))

  const [classesResult, placementsResult, assignmentsResult] = await Promise.all([
    classIds.length > 0
      ? sb.from('classes').select('*').in('id', classIds)
      : Promise.resolve({ data: [], error: null }),
    sb
      .from('placements')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    sb.from('teacher_assignments').select('*').in('student_id', studentIds),
  ])

  if (classesResult.error) throw new Error(`fetchAssignments classes: ${classesResult.error.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchAssignments placements: ${placementsResult.error.message}`)
  }
  if (assignmentsResult.error) {
    throw new Error(`fetchAssignments teacher_assignments: ${assignmentsResult.error.message}`)
  }

  const placements = ((placementsResult.data as PlacementRow[]) ?? []).filter((placement) =>
    filters.periodId ? placement.period_id === filters.periodId : true,
  )
  const assignments = ((assignmentsResult.data as TeacherAssignmentRow[]) ?? []).filter((assignment) =>
    filters.periodId ? assignment.period_id === filters.periodId || assignment.period_id === null : true,
  )

  const placementByStudent = latestPlacementByStudent(placements)
  const assignmentByStudent = latestAssignmentByStudent(assignments)
  const selectedPlacements = [...placementByStudent.values()]
  const teacherIds = unique([
    ...selectedPlacements.map((placement) => placement.referent_id),
    ...assignments.map((assignment) => assignment.teacher_id),
  ])
  const companyIds = unique(selectedPlacements.map((placement) => placement.company_id))
  const periodIds = unique([
    ...selectedPlacements.map((placement) => placement.period_id),
    ...assignments.map((assignment) => assignment.period_id),
  ])

  const [teachersResult, companiesResult, periodsResult] = await Promise.all([
    teacherIds.length > 0
      ? sb.from('teachers').select('*').in('id', teacherIds).is('archived_at', null)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length > 0
      ? sb.from('companies').select('*').in('id', companyIds).is('archived_at', null)
      : Promise.resolve({ data: [], error: null }),
    periodIds.length > 0
      ? sb.from('pfmp_periods').select('*').in('id', periodIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (teachersResult.error) throw new Error(`fetchAssignments teachers: ${teachersResult.error.message}`)
  if (companiesResult.error) throw new Error(`fetchAssignments companies: ${companiesResult.error.message}`)
  if (periodsResult.error) throw new Error(`fetchAssignments periods: ${periodsResult.error.message}`)

  const classById = indexById((classesResult.data as ClassRow[]) ?? [])
  const teacherById = indexById((teachersResult.data as TeacherRow[]) ?? [])
  const companyById = indexById((companiesResult.data as CompanyRow[]) ?? [])
  const periodById = indexById((periodsResult.data as PfmpPeriodRow[]) ?? [])

  return students.map((student) => {
    const placement = placementByStudent.get(student.id) ?? null
    const assignment = assignmentByStudent.get(student.id) ?? null
    const referentId = placement?.referent_id ?? assignment?.teacher_id ?? null
    const periodId = placement?.period_id ?? assignment?.period_id ?? null
    return {
      student,
      class: student.class_id ? classById.get(student.class_id) ?? null : null,
      period: periodId ? periodById.get(periodId) ?? null : null,
      placement,
      company: placement?.company_id ? companyById.get(placement.company_id) ?? null : null,
      referent: referentId ? teacherById.get(referentId) ?? null : null,
    }
  })
}

export async function fetchTeacherLoads(): Promise<TeacherLoadItem[]> {
  const sb = getSupabase()
  const [teachersResult, assignmentsResult] = await Promise.all([
    sb.from('teachers').select('*').is('archived_at', null).order('last_name').order('first_name'),
    sb.from('teacher_assignments').select('*'),
  ])

  if (teachersResult.error) throw new Error(`fetchTeacherLoads teachers: ${teachersResult.error.message}`)
  if (assignmentsResult.error) {
    throw new Error(`fetchTeacherLoads assignments: ${assignmentsResult.error.message}`)
  }

  const assignmentsByTeacher = groupBy(
    (assignmentsResult.data as TeacherAssignmentRow[]) ?? [],
    (assignment) => assignment.teacher_id,
  )

  return ((teachersResult.data as TeacherRow[]) ?? []).map((teacher) => ({
    teacher,
    studentLoad: unique((assignmentsByTeacher.get(teacher.id) ?? []).map((assignment) => assignment.student_id)).length,
  }))
}

export async function fetchAssignmentOptions(): Promise<AssignmentOptions> {
  const sb = getSupabase()
  const [classesResult, periodsResult] = await Promise.all([
    sb.from('classes').select('*').order('name'),
    sb.from('pfmp_periods').select('*').order('start_date', { ascending: false }),
  ])

  if (classesResult.error) throw new Error(`fetchAssignmentOptions classes: ${classesResult.error.message}`)
  if (periodsResult.error) throw new Error(`fetchAssignmentOptions periods: ${periodsResult.error.message}`)

  return {
    classes: (classesResult.data as ClassRow[]) ?? [],
    periods: (periodsResult.data as PfmpPeriodRow[]) ?? [],
  }
}

function latestPlacementByStudent(placements: PlacementRow[]): Map<string, PlacementRow> {
  const map = new Map<string, PlacementRow>()
  for (const placement of placements) {
    if (!map.has(placement.student_id)) map.set(placement.student_id, placement)
  }
  return map
}

function latestAssignmentByStudent(assignments: TeacherAssignmentRow[]): Map<string, TeacherAssignmentRow> {
  const map = new Map<string, TeacherAssignmentRow>()
  for (const assignment of assignments) {
    if (!map.has(assignment.student_id)) map.set(assignment.student_id, assignment)
  }
  return map
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const value = key(row)
    const list = map.get(value) ?? []
    list.push(row)
    map.set(value, list)
  }
  return map
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
