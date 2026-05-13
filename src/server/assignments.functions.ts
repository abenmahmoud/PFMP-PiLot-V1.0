import { createServerFn } from '@tanstack/react-start'
import type { ProfileRow } from '@/lib/database.types'
import {
  createAdminClient,
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

export const assignReferentToStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignReferentInput)
  .handler(async ({ data }): Promise<never> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await getCallerProfile(adminClient, data.accessToken)
      throw new Error('Non implemente - sera livre en P1.6')
    })
  })

export const assignPlacementToStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignPlacementInput)
  .handler(async ({ data }): Promise<never> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      await getCallerProfile(adminClient, data.accessToken)
      throw new Error('Non implemente - sera livre en P1.6')
    })
  })

function validateAssignReferentInput(raw: unknown): AssignReferentToStudentInput {
  const data = raw as Partial<AssignReferentToStudentInput>
  const accessToken = readRequiredString(data.accessToken, 'Session')
  return {
    accessToken,
    studentId: validateUuid(data.studentId, 'Eleve'),
    referentId: validateUuid(data.referentId, 'Referent'),
  }
}

function validateAssignPlacementInput(raw: unknown): AssignPlacementToStudentInput {
  const data = raw as Partial<AssignPlacementToStudentInput>
  const accessToken = readRequiredString(data.accessToken, 'Session')
  return {
    accessToken,
    studentId: validateUuid(data.studentId, 'Eleve'),
    periodId: validateUuid(data.periodId, 'Periode PFMP'),
    companyId: validateUuid(data.companyId, 'Entreprise'),
    tutorId: data.tutorId ? validateUuid(data.tutorId, 'Tuteur') : null,
  }
}

async function getCallerProfile(
  adminClient: AdminClient,
  accessToken: string,
): Promise<ProfileRow> {
  const { data: userResult, error: userError } = await adminClient.auth.getUser(accessToken)
  const caller = userResult.user
  if (userError || !caller) throw new Error('Session invalide. Reconnectez-vous.')

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .maybeSingle()
  if (error) throw new Error(`Lecture profil appelant impossible: ${error.message}`)
  if (!profile) throw new Error('Profil appelant introuvable.')
  return profile as unknown as ProfileRow
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} manquante.`)
  }
  return value.trim()
}
