import { getSupabase } from '@/lib/supabase'
import type { ClassRow, PlacementRow, ProfileRow, StudentRow } from '@/lib/database.types'

export interface ClassListItem {
  class: ClassRow
  principal: ProfileRow | null
  studentCount: number
  noStageCount: number
}

export async function fetchClasses(): Promise<ClassListItem[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('classes')
    .select('*')
    .order('school_year', { ascending: false })
    .order('name')

  if (error) throw new Error(`fetchClasses classes: ${error.message}`)

  const classes = (data as ClassRow[]) ?? []
  if (classes.length === 0) return []

  const classIds = classes.map((klass) => klass.id)
  const principalIds = unique(classes.map((klass) => klass.principal_id))

  const [studentsResult, principalsResult] = await Promise.all([
    sb
      .from('students')
      .select('*')
      .in('class_id', classIds)
      .is('archived_at', null),
    principalIds.length > 0
      ? sb.from('profiles').select('*').in('id', principalIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (studentsResult.error) throw new Error(`fetchClasses students: ${studentsResult.error.message}`)
  if (principalsResult.error) {
    throw new Error(`fetchClasses principals: ${principalsResult.error.message}`)
  }

  const students = (studentsResult.data as StudentRow[]) ?? []
  const studentIds = students.map((student) => student.id)
  const placementsResult =
    studentIds.length > 0
      ? await sb
          .from('placements')
          .select('*')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  if (placementsResult.error) {
    throw new Error(`fetchClasses placements: ${placementsResult.error.message}`)
  }

  const studentsByClass = groupBy(students, (student) => student.class_id ?? '')
  const latestPlacement = latestPlacementByStudent((placementsResult.data as PlacementRow[]) ?? [])
  const principalById = indexById((principalsResult.data as ProfileRow[]) ?? [])

  return classes.map((klass) => {
    const inClass = studentsByClass.get(klass.id) ?? []
    return {
      class: klass,
      principal: klass.principal_id ? principalById.get(klass.principal_id) ?? null : null,
      studentCount: inClass.length,
      noStageCount: inClass.filter((student) => {
        const placement = latestPlacement.get(student.id)
        return !placement || placement.status === 'no_stage'
      }).length,
    }
  })
}

function latestPlacementByStudent(placements: PlacementRow[]): Map<string, PlacementRow> {
  const map = new Map<string, PlacementRow>()
  for (const placement of placements) {
    if (!map.has(placement.student_id)) map.set(placement.student_id, placement)
  }
  return map
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

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
