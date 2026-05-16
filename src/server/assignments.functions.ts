import { createServerFn } from '@tanstack/react-start'
import type { ClassRow, PlacementRow, ProfileRow, StudentRow, TeacherRow } from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

interface AssignReferentToStudentInput {
  accessToken: string
  studentId: string
  referentId: string
}

interface AssignPlacementToStudentInput {
  accessToken: string
  studentId: string
  periodId: string
  companyId: string
  tutorId?: string | null
}

interface AssignClassPrincipalInput {
  accessToken: string
  classId: string
  teacherId: string | null
}

type AssignReferentResult = { ok: true; studentId: string; referentId: string }
type AssignClassPrincipalResult = { ok: true; classId: string; principalId: string | null }

export const assignReferentToStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignReferentInput)
  .handler(async ({ data }): Promise<AssignReferentResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const student = await getStudent(adminClient, data.studentId)
      const klass = student.class_id ? await getClass(adminClient, student.class_id) : null
      if (!klass) throw new Error('Eleve sans classe: affectation referent impossible.')
      assertCanAssignReferent(caller, klass)

      const referent = await getReferentProfile(adminClient, data.referentId, student.establishment_id)
      const referentTeacher = await getTeacherByProfileId(adminClient, referent.id, student.establishment_id)
      const placement = await getLatestPlacement(adminClient, student.id)

      const { error } = await adminClient
        .from('students')
        .update({ referent_id: referent.id })
        .eq('id', student.id)
      if (error) throw new Error(`Affectation referent impossible: ${error.message}`)

      await syncReferentAssignment(adminClient, student, referentTeacher, placement)

      await insertAuditLog(adminClient, {
        establishmentId: student.establishment_id,
        userId: caller.id,
        action: 'student.referent_assigned',
        description: `Referent affecte a ${student.first_name} ${student.last_name}`,
        metadata: {
          student_id: student.id,
          referent_id: referent.id,
          teacher_id: referentTeacher.id,
          placement_id: placement?.id ?? null,
          period_id: placement?.period_id ?? null,
          class_id: klass.id,
          source: 'server.assignments',
        },
      })
      return { ok: true, studentId: student.id, referentId: referent.id }
    })
  })

export const assignPlacementToStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignPlacementInput)
  .handler(async ({ data }): Promise<never> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await getCallerProfile(adminClient, data.accessToken)
      throw new Error('Non implemente - sera livre en P1.8')
    })
  })

export const assignClassPrincipal = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignClassPrincipalInput)
  .handler(async ({ data }): Promise<AssignClassPrincipalResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const klass = await getClass(adminClient, data.classId)
      assertCanAssignClassPrincipal(caller, klass)

      const principalId = data.teacherId
        ? await resolvePrincipalProfileId(adminClient, data.teacherId, klass.establishment_id)
        : null

      const { error } = await adminClient
        .from('classes')
        .update({ principal_id: principalId })
        .eq('id', klass.id)
      if (error) throw new Error(`Affectation professeur principal impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: klass.establishment_id,
        userId: caller.id,
        action: 'class.principal_assigned',
        description: principalId
          ? `Professeur principal affecte a la classe ${klass.name}`
          : `Professeur principal retire de la classe ${klass.name}`,
        metadata: {
          class_id: klass.id,
          teacher_id: data.teacherId,
          principal_id: principalId,
          source: 'server.assignments',
        },
      })
      return { ok: true, classId: klass.id, principalId }
    })
  })

function validateAssignReferentInput(raw: unknown): AssignReferentToStudentInput {
  const data = raw as Partial<AssignReferentToStudentInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    studentId: validateUuid(data.studentId, 'Eleve'),
    referentId: validateUuid(data.referentId, 'Referent'),
  }
}

async function getTeacherByProfileId(
  adminClient: AdminClient,
  profileId: string,
  establishmentId: string,
): Promise<TeacherRow> {
  const { data, error } = await adminClient
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .eq('establishment_id', establishmentId)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(`Lecture professeur referent impossible: ${error.message}`)
  if (!data) throw new Error('Ce referent n a pas encore de fiche professeur rattachee.')
  return data as unknown as TeacherRow
}

async function getLatestPlacement(adminClient: AdminClient, studentId: string): Promise<PlacementRow | null> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('student_id', studentId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture dossier PFMP impossible: ${error.message}`)
  return (data as unknown as PlacementRow | null) ?? null
}

async function syncReferentAssignment(
  adminClient: AdminClient,
  student: StudentRow,
  referentTeacher: TeacherRow,
  placement: PlacementRow | null,
): Promise<void> {
  let deleteQuery = adminClient
    .from('teacher_assignments')
    .delete()
    .eq('establishment_id', student.establishment_id)
    .eq('student_id', student.id)

  deleteQuery = placement?.period_id ? deleteQuery.eq('period_id', placement.period_id) : deleteQuery.is('period_id', null)
  const { error: deleteError } = await deleteQuery
  if (deleteError) throw new Error(`Nettoyage affectation referent impossible: ${deleteError.message}`)

  const { error: insertError } = await adminClient.from('teacher_assignments').insert({
    establishment_id: student.establishment_id,
    teacher_id: referentTeacher.id,
    student_id: student.id,
    period_id: placement?.period_id ?? null,
  })
  if (insertError) throw new Error(`Creation affectation referent impossible: ${insertError.message}`)

  if (placement) {
    const { error: placementError } = await adminClient
      .from('placements')
      .update({ referent_id: referentTeacher.id, updated_at: new Date().toISOString() })
      .eq('id', placement.id)
    if (placementError) throw new Error(`Mise a jour referent dossier impossible: ${placementError.message}`)
  }
}

function validateAssignPlacementInput(raw: unknown): AssignPlacementToStudentInput {
  const data = raw as Partial<AssignPlacementToStudentInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    studentId: validateUuid(data.studentId, 'Eleve'),
    periodId: validateUuid(data.periodId, 'Periode PFMP'),
    companyId: validateUuid(data.companyId, 'Entreprise'),
    tutorId: data.tutorId ? validateUuid(data.tutorId, 'Tuteur') : null,
  }
}

function validateAssignClassPrincipalInput(raw: unknown): AssignClassPrincipalInput {
  const data = raw as Partial<AssignClassPrincipalInput>
  return {
    accessToken: readRequiredString(data.accessToken, 'Session'),
    classId: validateUuid(data.classId, 'Classe'),
    teacherId: data.teacherId ? validateUuid(data.teacherId, 'Professeur') : null,
  }
}

async function getStudent(adminClient: AdminClient, studentId: string): Promise<StudentRow> {
  const { data, error } = await adminClient.from('students').select('*').eq('id', studentId).maybeSingle()
  if (error) throw new Error(`Lecture eleve impossible: ${error.message}`)
  if (!data) throw new Error('Eleve introuvable.')
  return data as unknown as StudentRow
}

async function getClass(adminClient: AdminClient, classId: string): Promise<ClassRow> {
  const { data, error } = await adminClient.from('classes').select('*').eq('id', classId).maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  if (!data) throw new Error('Classe introuvable.')
  return data as unknown as ClassRow
}

async function getReferentProfile(
  adminClient: AdminClient,
  profileId: string,
  establishmentId: string,
): Promise<ProfileRow> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .eq('establishment_id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture referent impossible: ${error.message}`)
  if (!data) throw new Error('Referent introuvable dans cet etablissement.')
  const profile = data as unknown as ProfileRow
  if (profile.role !== 'referent' && profile.role !== 'principal') {
    throw new Error('Le referent doit avoir le role referent ou professeur principal.')
  }
  return profile
}

async function resolvePrincipalProfileId(
  adminClient: AdminClient,
  teacherId: string,
  establishmentId: string,
): Promise<string> {
  const { data: teacherData, error: teacherError } = await adminClient
    .from('teachers')
    .select('*')
    .eq('id', teacherId)
    .eq('establishment_id', establishmentId)
    .is('archived_at', null)
    .maybeSingle()
  if (teacherError) throw new Error(`Lecture professeur impossible: ${teacherError.message}`)
  if (!teacherData) throw new Error('Professeur introuvable.')
  const teacher = teacherData as unknown as TeacherRow
  if (!teacher.profile_id) {
    throw new Error('Ce professeur n a pas encore de compte connecte: impossible de le definir principal.')
  }

  const { data: profileData, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', teacher.profile_id)
    .eq('establishment_id', establishmentId)
    .maybeSingle()
  if (profileError) throw new Error(`Lecture profil professeur impossible: ${profileError.message}`)
  if (!profileData) throw new Error('Profil professeur introuvable.')
  const profile = profileData as unknown as ProfileRow
  if (!['principal', 'admin', 'ddfpt'].includes(profile.role)) {
    throw new Error('Le professeur principal doit avoir le role principal, admin ou DDFPT.')
  }
  return profile.id
}

function assertCanAssignReferent(caller: ProfileRow, klass: ClassRow): void {
  if (caller.role === 'superadmin') return
  if (caller.establishment_id !== klass.establishment_id) {
    throw new Error('Acces refuse: classe hors etablissement.')
  }
  if (caller.role === 'admin' || caller.role === 'ddfpt') return
  if (caller.role === 'principal' && klass.principal_id === caller.id) return
  throw new Error('Acces refuse: vous ne pouvez pas affecter un referent pour cette classe.')
}

function assertCanAssignClassPrincipal(caller: ProfileRow, klass: ClassRow): void {
  if (caller.role === 'superadmin') return
  if (caller.establishment_id !== klass.establishment_id) {
    throw new Error('Acces refuse: classe hors etablissement.')
  }
  if (caller.role === 'admin' || caller.role === 'ddfpt') return
  throw new Error('Acces refuse: seuls admin, DDFPT et superadmin peuvent affecter un professeur principal.')
}

function readRequiredString(value: unknown, label: string): string {
  const next = clean(value)
  if (!next) throw new Error(`${label} manquante.`)
  return next
}
