import { getSupabase } from '@/lib/supabase'
import type { AuditLogRow, ClassRow, StudentRow } from '@/lib/database.types'
import {
  listTeachersForEstablishment,
  type TeacherWithStats,
} from '@/server/teachers.functions'

export type TeacherDetail = {
  teacher: TeacherWithStats
  classes: ClassRow[]
  students: StudentRow[]
  auditLogs: AuditLogRow[]
}

export type TeacherListItem = TeacherWithStats

export async function fetchTeachersWithStats(accessToken: string): Promise<TeacherWithStats[]> {
  return listTeachersForEstablishment({ data: { accessToken } })
}

export async function fetchTeachers(accessToken?: string): Promise<TeacherWithStats[]> {
  if (accessToken) return fetchTeachersWithStats(accessToken)
  return []
}

export async function fetchTeacherDetail(
  teacherId: string,
  accessToken: string,
): Promise<TeacherDetail | null> {
  const teachers = await fetchTeachersWithStats(accessToken)
  const teacher = teachers.find((item) => item.id === teacherId)
  if (!teacher) return null

  const sb = getSupabase()
  const [classesResult, studentsResult, auditResult] = await Promise.all([
    teacher.profile_id
      ? sb.from('classes').select('*').eq('principal_id', teacher.profile_id).order('name')
      : Promise.resolve({ data: [], error: null }),
    teacher.profile_id
      ? sb.from('students').select('*').eq('referent_id', teacher.profile_id).is('archived_at', null)
      : Promise.resolve({ data: [], error: null }),
    teacher.profile_id
      ? sb
          .from('audit_logs')
          .select('*')
          .eq('user_id', teacher.profile_id)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (classesResult.error) throw new Error(`fetchTeacherDetail classes: ${classesResult.error.message}`)
  if (studentsResult.error) throw new Error(`fetchTeacherDetail students: ${studentsResult.error.message}`)
  if (auditResult.error) throw new Error(`fetchTeacherDetail audit: ${auditResult.error.message}`)

  return {
    teacher,
    classes: (classesResult.data as ClassRow[]) ?? [],
    students: (studentsResult.data as StudentRow[]) ?? [],
    auditLogs: (auditResult.data as AuditLogRow[]) ?? [],
  }
}
