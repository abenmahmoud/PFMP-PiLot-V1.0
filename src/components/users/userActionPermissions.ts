import type { UserRole } from '@/lib/database.types'
import type { UserRowEnriched } from '@/server/users.functions'

export type UserActionId =
  | 'resend-invitation'
  | 'send-password-reset'
  | 'update-email'
  | 'change-role'
  | 'change-establishment'
  | 'soft-delete'
  | 'restore'
  | 'hard-delete'

interface PermissionInput {
  user: UserRowEnriched
  callerRole: UserRole
  callerId: string
  callerEstablishmentId: string | null
}

const PROTECTED_ROLES: UserRole[] = ['superadmin', 'admin']

export function getAvailableUserActions({
  user,
  callerRole,
  callerId,
  callerEstablishmentId,
}: PermissionInput): UserActionId[] {
  const isSelf = user.id === callerId
  const isSuperadmin = callerRole === 'superadmin'
  const isTenantAdmin =
    callerRole === 'admin' &&
    Boolean(callerEstablishmentId) &&
    callerEstablishmentId === user.establishment_id &&
    !PROTECTED_ROLES.includes(user.role)
  const canManage = isSuperadmin || isTenantAdmin

  if (!canManage) return []

  const actions: UserActionId[] = []
  const isPending = !user.email_confirmed_at && !user.archived_at
  const isConfirmed = Boolean(user.email_confirmed_at) && !user.archived_at

  if (user.archived_at) {
    actions.push('restore')
    if (isSuperadmin && !isSelf) actions.push('hard-delete')
    return actions
  }

  if (isPending) {
    actions.push('resend-invitation', 'update-email')
  }
  if (isConfirmed) {
    actions.push('send-password-reset')
  }

  actions.push('change-role')
  if (isSuperadmin) actions.push('change-establishment')
  if (!isSelf) actions.push('soft-delete')
  if (isSuperadmin && !isSelf) actions.push('hard-delete')

  return actions
}

export function getAssignableRoles(callerRole: UserRole): UserRole[] {
  if (callerRole === 'superadmin') {
    return ['admin', 'ddfpt', 'principal', 'referent', 'eleve']
  }
  if (callerRole === 'admin') {
    return ['ddfpt', 'principal', 'referent', 'eleve']
  }
  return []
}
