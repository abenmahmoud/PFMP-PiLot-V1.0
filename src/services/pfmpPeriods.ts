import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type {
  ClassRow,
  DocumentRow,
  PfmpPeriodRow,
  PlacementRow,
  StudentRow,
  VisitRow,
} from '@/lib/database.types'

interface PeriodClassLink {
  period_id: string
  class_id: string
}

export interface PfmpPeriodListItem {
  period: PfmpPeriodRow
  classes: ClassRow[]
  studentCount: number
  assignmentRate: number
  visitRate: number
  missingDocuments: number
}

export async function fetchPfmpPeriods(): Promise<PfmpPeriodListItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('pfmp_periods')
    .select('*')
    .order('start_date', { ascending: false })

  if (scope) query = query.eq('establishment_id', scope)

  const { data, error } = await query

  if (error) throw new Error(`fetchPfmpPeriods periods: ${error.message}`)

  const periods = (data as PfmpPeriodRow[]) ?? []
  if (periods.length === 0) return []

  const periodIds = periods.map((period) => period.id)
  const [linksResult, placementsResult, visitsResult, documentsResult] = await Promise.all([
    sb.from('pfmp_period_classes').select('*').in('period_id', periodIds),
    sb.from('placements').select('*').in('period_id', periodIds),
    sb.from('visits').select('*').in('period_id', periodIds),
    sb.from('documents').select('*').in('period_id', periodIds).is('archived_at', null),
  ])

  if (linksResult.error) throw new Error(`fetchPfmpPeriods links: ${linksResult.error.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchPfmpPeriods placements: ${placementsResult.error.message}`)
  }
  if (visitsResult.error) throw new Error(`fetchPfmpPeriods visits: ${visitsResult.error.message}`)
  if (documentsResult.error) {
    throw new Error(`fetchPfmpPeriods documents: ${documentsResult.error.message}`)
  }

  const links = (linksResult.data as PeriodClassLink[]) ?? []
  const classIds = unique(links.map((link) => link.class_id))
  const [classesResult, studentsResult] = await Promise.all([
    classIds.length > 0
      ? sb.from('classes').select('*').in('id', classIds).order('name')
      : Promise.resolve({ data: [], error: null }),
    classIds.length > 0
      ? sb.from('students').select('*').in('class_id', classIds).is('archived_at', null)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (classesResult.error) throw new Error(`fetchPfmpPeriods classes: ${classesResult.error.message}`)
  if (studentsResult.error) {
    throw new Error(`fetchPfmpPeriods students: ${studentsResult.error.message}`)
  }

  const classById = indexById((classesResult.data as ClassRow[]) ?? [])
  const studentsByClass = groupBy(
    (studentsResult.data as StudentRow[]) ?? [],
    (student) => student.class_id ?? '',
  )
  const linksByPeriod = groupBy(links, (link) => link.period_id)
  const placementsByPeriod = groupBy(
    (placementsResult.data as PlacementRow[]) ?? [],
    (placement) => placement.period_id,
  )
  const visitsByPeriod = groupBy((visitsResult.data as VisitRow[]) ?? [], (visit) => visit.period_id ?? '')
  const documentsByPeriod = groupBy(
    (documentsResult.data as DocumentRow[]) ?? [],
    (document) => document.period_id ?? '',
  )

  return periods.map((period) => {
    const periodLinks = linksByPeriod.get(period.id) ?? []
    const periodClasses = periodLinks
      .map((link) => classById.get(link.class_id))
      .filter(Boolean) as ClassRow[]
    const students = periodLinks.flatMap((link) => studentsByClass.get(link.class_id) ?? [])
    const studentIds = unique(students.map((student) => student.id))
    const placements = placementsByPeriod.get(period.id) ?? []
    const visits = visitsByPeriod.get(period.id) ?? []
    const documents = documentsByPeriod.get(period.id) ?? []
    const assignedStudents = unique(
      placements
        .filter((placement) => placement.status !== 'no_stage')
        .map((placement) => placement.student_id),
    )
    const visitedStudents = unique(visits.map((visit) => visit.student_id))

    return {
      period,
      classes: periodClasses,
      studentCount: studentIds.length,
      assignmentRate: ratio(assignedStudents.length, studentIds.length),
      visitRate: ratio(visitedStudents.length, assignedStudents.length || studentIds.length),
      missingDocuments: documents.filter((document) => document.status === 'missing').length,
    }
  })
}

function ratio(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
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
