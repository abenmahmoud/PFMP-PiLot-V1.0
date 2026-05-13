import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type {
  AlertRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  PlacementRow,
  ProfileRow,
  StageStatus,
  StudentRow,
  TeacherRow,
  TutorRow,
  VisitRow,
} from '@/lib/database.types'

export interface StudentFilters {
  classId?: string
  stageStatus?: StageStatus
  referentId?: string
}

export interface StudentListItem {
  student: StudentRow
  class: ClassRow | null
  placement: PlacementRow | null
  company: CompanyRow | null
  referent: TeacherRow | null
  stageStatus: StageStatus
}

export interface StudentDetail {
  student: StudentRow
  class: ClassRow | null
  placement: PlacementRow | null
  company: CompanyRow | null
  tutor: TutorRow | null
  referent: TeacherRow | null
  visits: VisitRow[]
  documents: DocumentRow[]
  alerts: AlertRow[]
  accessCode: {
    id: string
    code_hint: string
    status: string
    created_at: string
  } | null
}

export async function fetchStudents(
  filters: StudentFilters = {},
  profile?: ProfileRow | null,
): Promise<StudentListItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('students')
    .select('*')
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')

  if (scope) query = query.eq('establishment_id', scope)
  if (filters.classId) query = query.eq('class_id', filters.classId)

  const { data, error } = await query
  if (error) throw new Error(`fetchStudents students: ${error.message}`)

  const students = (data as StudentRow[]) ?? []
  if (students.length === 0) return []

  const studentIds = students.map((student) => student.id)
  const classIds = unique(students.map((student) => student.class_id))

  const [{ data: classes, error: classesError }, { data: placements, error: placementsError }] =
    await Promise.all([
      classIds.length > 0
        ? sb.from('classes').select('*').in('id', classIds)
        : Promise.resolve({ data: [], error: null }),
      sb
        .from('placements')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false }),
    ])

  if (classesError) throw new Error(`fetchStudents classes: ${classesError.message}`)
  if (placementsError) throw new Error(`fetchStudents placements: ${placementsError.message}`)

  const classById = indexById((classes as ClassRow[]) ?? [])
  const placementByStudentId = latestPlacementByStudent((placements as PlacementRow[]) ?? [])
  const selectedPlacements = [...placementByStudentId.values()]
  const companyIds = unique(selectedPlacements.map((placement) => placement.company_id))
  const referentIds = unique(selectedPlacements.map((placement) => placement.referent_id))

  const [{ data: companies, error: companiesError }, { data: referents, error: referentsError }] =
    await Promise.all([
      companyIds.length > 0
        ? sb.from('companies').select('*').in('id', companyIds)
        : Promise.resolve({ data: [], error: null }),
      referentIds.length > 0
        ? sb.from('teachers').select('*').in('id', referentIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (companiesError) throw new Error(`fetchStudents companies: ${companiesError.message}`)
  if (referentsError) throw new Error(`fetchStudents referents: ${referentsError.message}`)

  const companyById = indexById((companies as CompanyRow[]) ?? [])
  const referentById = indexById((referents as TeacherRow[]) ?? [])

  return students
    .map((student) => {
      const placement = placementByStudentId.get(student.id) ?? null
      return {
        student,
        class: student.class_id ? classById.get(student.class_id) ?? null : null,
        placement,
        company: placement?.company_id ? companyById.get(placement.company_id) ?? null : null,
        referent: placement?.referent_id ? referentById.get(placement.referent_id) ?? null : null,
        stageStatus: placement?.status ?? 'no_stage',
      }
    })
    .filter((item) => {
      if (profile?.role === 'principal') {
        if (!item.class || item.class.principal_id !== profile.id) return false
      }
      if (filters.stageStatus && item.stageStatus !== filters.stageStatus) return false
      if (filters.referentId && item.placement?.referent_id !== filters.referentId) return false
      return true
    })
}

export async function fetchStudentById(
  id: string,
  profile?: ProfileRow | null,
): Promise<StudentDetail | null> {
  const sb = getSupabase()
  const { data: studentData, error: studentError } = await sb
    .from('students')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle()

  if (studentError) throw new Error(`fetchStudentById student: ${studentError.message}`)

  const student = (studentData as StudentRow | null) ?? null
  if (!student) return null

  const [
    classResult,
    placementsResult,
    visitsResult,
    documentsResult,
    alertsResult,
    accessCodeResult,
  ] = await Promise.all([
    student.class_id
      ? sb.from('classes').select('*').eq('id', student.class_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb
      .from('placements')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
    sb
      .from('visits')
      .select('*')
      .eq('student_id', student.id)
      .order('date', { ascending: false }),
    sb
      .from('documents')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
    sb
      .from('alerts')
      .select('*')
      .eq('related_entity_type', 'student')
      .eq('related_entity_id', student.id)
      .eq('resolved', false)
      .order('created_at', { ascending: false }),
    sb
      .from('student_access_codes')
      .select('id, code_hint, status, created_at')
      .eq('student_id', student.id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (classResult.error) throw new Error(`fetchStudentById class: ${classResult.error.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchStudentById placements: ${placementsResult.error.message}`)
  }
  if (visitsResult.error) throw new Error(`fetchStudentById visits: ${visitsResult.error.message}`)
  if (documentsResult.error) {
    throw new Error(`fetchStudentById documents: ${documentsResult.error.message}`)
  }
  if (alertsResult.error) throw new Error(`fetchStudentById alerts: ${alertsResult.error.message}`)
  if (accessCodeResult.error) {
    console.warn('fetchStudentById accessCode:', accessCodeResult.error.message)
  }

  const studentClass = (classResult.data as ClassRow | null) ?? null
  if (profile?.role === 'principal' && studentClass?.principal_id !== profile.id) {
    return null
  }

  const placements = (placementsResult.data as PlacementRow[]) ?? []
  const placement = placements[0] ?? null

  const [companyResult, tutorResult, referentResult] = await Promise.all([
    placement?.company_id
      ? sb.from('companies').select('*').eq('id', placement.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    placement?.tutor_id
      ? sb.from('tutors').select('*').eq('id', placement.tutor_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    placement?.referent_id
      ? sb.from('teachers').select('*').eq('id', placement.referent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (companyResult.error) {
    throw new Error(`fetchStudentById company: ${companyResult.error.message}`)
  }
  if (tutorResult.error) throw new Error(`fetchStudentById tutor: ${tutorResult.error.message}`)
  if (referentResult.error) {
    throw new Error(`fetchStudentById referent: ${referentResult.error.message}`)
  }

  return {
    student,
    class: studentClass,
    placement,
    company: (companyResult.data as CompanyRow | null) ?? null,
    tutor: (tutorResult.data as TutorRow | null) ?? null,
    referent: (referentResult.data as TeacherRow | null) ?? null,
    visits: (visitsResult.data as VisitRow[]) ?? [],
    documents: (documentsResult.data as DocumentRow[]) ?? [],
    alerts: (alertsResult.data as AlertRow[]) ?? [],
    accessCode: (accessCodeResult.data as {
      id: string
      code_hint: string
      status: string
      created_at: string
    } | null) ?? null,
  }
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

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
