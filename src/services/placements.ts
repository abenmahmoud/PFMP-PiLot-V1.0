import { getSupabase } from '@/lib/supabase'
import type {
  CompanyRow,
  DocumentRow,
  PfmpPeriodRow,
  PlacementRow,
  StudentRow,
  TeacherRow,
  TutorRow,
  VisitRow,
} from '@/lib/database.types'

export interface PlacementDetail {
  placement: PlacementRow
  student: StudentRow | null
  period: PfmpPeriodRow | null
  company: CompanyRow | null
  tutor: TutorRow | null
  referent: TeacherRow | null
  visits: VisitRow[]
  documents: DocumentRow[]
}

export async function fetchPlacementById(id: string): Promise<PlacementDetail | null> {
  const sb = getSupabase()
  const { data: placementData, error: placementError } = await sb
    .from('placements')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (placementError) throw new Error(`fetchPlacementById placement: ${placementError.message}`)

  const placement = (placementData as PlacementRow | null) ?? null
  if (!placement) return null

  const [
    studentResult,
    periodResult,
    companyResult,
    tutorResult,
    referentResult,
    visitsResult,
    documentsResult,
  ] = await Promise.all([
    sb.from('students').select('*').eq('id', placement.student_id).maybeSingle(),
    sb.from('pfmp_periods').select('*').eq('id', placement.period_id).maybeSingle(),
    placement.company_id
      ? sb.from('companies').select('*').eq('id', placement.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    placement.tutor_id
      ? sb.from('tutors').select('*').eq('id', placement.tutor_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    placement.referent_id
      ? sb.from('teachers').select('*').eq('id', placement.referent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb
      .from('visits')
      .select('*')
      .eq('student_id', placement.student_id)
      .eq('period_id', placement.period_id)
      .order('date', { ascending: false }),
    sb
      .from('documents')
      .select('*')
      .eq('placement_id', placement.id)
      .order('created_at', { ascending: false }),
  ])

  if (studentResult.error) throw new Error(`fetchPlacementById student: ${studentResult.error.message}`)
  if (periodResult.error) throw new Error(`fetchPlacementById period: ${periodResult.error.message}`)
  if (companyResult.error) throw new Error(`fetchPlacementById company: ${companyResult.error.message}`)
  if (tutorResult.error) throw new Error(`fetchPlacementById tutor: ${tutorResult.error.message}`)
  if (referentResult.error) throw new Error(`fetchPlacementById referent: ${referentResult.error.message}`)
  if (visitsResult.error) throw new Error(`fetchPlacementById visits: ${visitsResult.error.message}`)
  if (documentsResult.error) throw new Error(`fetchPlacementById documents: ${documentsResult.error.message}`)

  return {
    placement,
    student: (studentResult.data as StudentRow | null) ?? null,
    period: (periodResult.data as PfmpPeriodRow | null) ?? null,
    company: (companyResult.data as CompanyRow | null) ?? null,
    tutor: (tutorResult.data as TutorRow | null) ?? null,
    referent: (referentResult.data as TeacherRow | null) ?? null,
    visits: (visitsResult.data as VisitRow[]) ?? [],
    documents: (documentsResult.data as DocumentRow[]) ?? [],
  }
}
