import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type { ClassRow, TeacherAssignmentRow, TeacherRow } from '@/lib/database.types'

export interface TeacherListItem {
  teacher: TeacherRow
  classes: ClassRow[]
  studentLoad: number
}

export async function fetchTeachers(): Promise<TeacherListItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('teachers')
    .select('*')
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')

  if (scope) query = query.eq('establishment_id', scope)

  const { data, error } = await query

  if (error) throw new Error(`fetchTeachers teachers: ${error.message}`)

  const teachers = (data as TeacherRow[]) ?? []
  if (teachers.length === 0) return []

  const teacherIds = teachers.map((teacher) => teacher.id)
  const profileIds = unique(teachers.map((teacher) => teacher.profile_id))

  const [assignmentsResult, classesResult] = await Promise.all([
    sb.from('teacher_assignments').select('*').in('teacher_id', teacherIds),
    profileIds.length > 0
      ? sb.from('classes').select('*').in('principal_id', profileIds).order('name')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (assignmentsResult.error) {
    throw new Error(`fetchTeachers assignments: ${assignmentsResult.error.message}`)
  }
  if (classesResult.error) throw new Error(`fetchTeachers classes: ${classesResult.error.message}`)

  const assignmentsByTeacher = groupBy(
    (assignmentsResult.data as TeacherAssignmentRow[]) ?? [],
    (assignment) => assignment.teacher_id,
  )
  const classesByPrincipal = groupBy(
    (classesResult.data as ClassRow[]) ?? [],
    (klass) => klass.principal_id ?? '',
  )

  return teachers.map((teacher) => ({
    teacher,
    classes: teacher.profile_id ? classesByPrincipal.get(teacher.profile_id) ?? [] : [],
    studentLoad: unique(
      (assignmentsByTeacher.get(teacher.id) ?? []).map((assignment) => assignment.student_id),
    ).length,
  }))
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
