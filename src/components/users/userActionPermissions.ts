import type { ClassRow, ProfileRow, UserRole } from '@/lib/database.types'
import { canManageUser, getManageableRoles } from '@/lib/permissions'
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

export function getAvailableUserActions({
  user,
  callerRole,
  callerId,
  callerEstablishmentId,
}: PermissionInput): UserActionId[] {
  const isSelf = user.id === callerId
  const isSuperadmin = callerRole === 'superadmin'
  const isTenantAdmin =
    Boolean(callerEstablishmentId) &&
    callerEstablishmentId === user.establishment_id &&
    canManageUser(callerRole, user.role)
  const canManage =
    isSuperadmin ||
    (isTenantAdmin &&
      Boolean(callerEstablishmentId) &&
      callerEstablishmentId === user.establishment_id)

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
  return getManageableRoles(callerRole)
}

export function canViewClass(user: ProfileRow, klass: ClassRow): boolean {
  if (user.role === 'superadmin') return true
  if (user.establishment_id !== klass.establishment_id) return false
  if (user.role === 'admin' || user.role === 'ddfpt') return true
  if (user.role === 'principal' && klass.principal_id === user.id) return true
  return false
}

export function canManageClassCodes(user: ProfileRow, klass: ClassRow): boolean {
  return canViewClass(user, klass)
}

export function canAssignReferent(user: ProfileRow, klass: ClassRow): boolean {
  return canViewClass(user, klass)
}

export function canAssignPlacement(user: ProfileRow, klass: ClassRow): boolean {
  return canViewClass(user, klass)
}
