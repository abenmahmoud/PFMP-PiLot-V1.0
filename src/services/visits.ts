import { getSupabase } from '@/lib/supabase'
import { logAuditAsync } from '@/lib/audit'
import type {
  ContactType,
  AlertLevel,
  PfmpPeriodRow,
  ProfileRow,
  StudentRow,
  TeacherRow,
  VisitRow,
} from '@/lib/database.types'

export interface VisitFormStudentOption {
  id: string
  firstName: string
  lastName: string
  className: string | null
}

export interface VisitFormOptions {
  students: VisitFormStudentOption[]
  teachers: TeacherRow[]
  periods: PfmpPeriodRow[]
  currentTeacher: TeacherRow | null
}

export interface CreateVisitInput {
  establishmentId: string
  studentId: string
  teacherId: string
  periodId: string | null
  date: string
  contactType: ContactType
  studentPresent: boolean | null
  tutorMet: boolean | null
  conditions: string | null
  activities: string | null
  professionalPosture: string | null
  positives: string | null
  difficulties: string | null
  tutorRemark: string | null
  teacherRemark: string | null
  alertLevel: AlertLevel
  nextAction: string | null
}

export async function fetchVisitFormOptions(profile: ProfileRow): Promise<VisitFormOptions> {
  const sb = getSupabase()
  const [studentsResult, teachersResult, periodsResult, currentTeacherResult] = await Promise.all([
    sb
      .from('students')
      .select('*')
      .is('archived_at', null)
      .order('last_name')
      .order('first_name'),
    sb
      .from('teachers')
      .select('*')
      .is('archived_at', null)
      .order('last_name')
      .order('first_name'),
    sb
      .from('pfmp_periods')
      .select('*')
      .in('status', ['preparation', 'in_progress'])
      .order('start_date', { ascending: false }),
    sb
      .from('teachers')
      .select('*')
      .eq('profile_id', profile.id)
      .is('archived_at', null)
      .maybeSingle(),
  ])

  if (studentsResult.error) throw new Error(`fetchVisitFormOptions students: ${studentsResult.error.message}`)
  if (teachersResult.error) throw new Error(`fetchVisitFormOptions teachers: ${teachersResult.error.message}`)
  if (periodsResult.error) throw new Error(`fetchVisitFormOptions periods: ${periodsResult.error.message}`)
  if (currentTeacherResult.error) {
    throw new Error(`fetchVisitFormOptions current teacher: ${currentTeacherResult.error.message}`)
  }

  const students = (studentsResult.data as StudentRow[]) ?? []
  const classIds = unique(students.map((student) => student.class_id))
  const classesResult =
    classIds.length > 0
      ? await sb.from('classes').select('id, name').in('id', classIds)
      : { data: [], error: null }

  if (classesResult.error) throw new Error(`fetchVisitFormOptions classes: ${classesResult.error.message}`)

  const classById = new Map(((classesResult.data as Array<{ id: string; name: string }>) ?? []).map((row) => [row.id, row.name]))

  return {
    students: students.map((student) => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      className: student.class_id ? classById.get(student.class_id) ?? null : null,
    })),
    teachers: (teachersResult.data as TeacherRow[]) ?? [],
    periods: (periodsResult.data as PfmpPeriodRow[]) ?? [],
    currentTeacher: (currentTeacherResult.data as TeacherRow | null) ?? null,
  }
}

export async function createVisit(input: CreateVisitInput): Promise<VisitRow> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('visits')
    .insert({
      establishment_id: input.establishmentId,
      student_id: input.studentId,
      teacher_id: input.teacherId,
      period_id: input.periodId,
      date: input.date,
      contact_type: input.contactType,
      student_present: input.studentPresent,
      tutor_met: input.tutorMet,
      conditions: input.conditions,
      activities: input.activities,
      professional_posture: input.professionalPosture,
      positives: input.positives,
      difficulties: input.difficulties,
      tutor_remark: input.tutorRemark,
      teacher_remark: input.teacherRemark,
      alert_level: input.alertLevel,
      next_action: input.nextAction,
      status: 'draft',
    })
    .select('*')
    .single()

  if (error) {
    const message = error.message.includes('row-level security')
      ? "Vous n'etes pas autorise a creer une visite pour cet eleve."
      : error.message
    throw new Error(`createVisit: ${message}`)
  }

  const visit = data as VisitRow
  logAuditAsync({
    action: 'visit_create',
    description: 'Visite creee en brouillon',
    establishmentId: visit.establishment_id,
    metadata: {
      visit_id: visit.id,
      student_id: visit.student_id,
      teacher_id: visit.teacher_id,
      period_id: visit.period_id,
    },
  })
  return visit
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
