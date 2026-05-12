import { useState } from 'react'
import {
  ArchiveRestore,
  KeyRound,
  Mail,
  MoreVertical,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/lib/database.types'
import {
  changeUserEstablishment,
  changeUserRole,
  hardDeleteUser,
  resendInvitation,
  restoreUser,
  sendPasswordReset,
  softDeleteUser,
  updateUserEmail,
  type UserRowEnriched,
} from '@/server/users.functions'
import { ChangeUserEstablishmentModal, type UserEstablishmentOption } from './ChangeUserEstablishmentModal'
import { ChangeUserRoleModal } from './ChangeUserRoleModal'
import { ConfirmDeleteUserModal } from './ConfirmDeleteUserModal'
import { HardDeleteUserModal } from './HardDeleteUserModal'
import { UpdateUserEmailModal } from './UpdateUserEmailModal'
import {
  getAssignableRoles,
  getAvailableUserActions,
  type UserActionId,
} from './userActionPermissions'

interface UserActionsMenuProps {
  user: UserRowEnriched
  callerRole: UserRole
  callerId: string
  callerEstablishmentId: string | null
  accessToken: string
  establishments?: UserEstablishmentOption[]
  onActionComplete: () => void
}

type ModalKind = 'email' | 'role' | 'establishment' | 'soft-delete' | 'hard-delete' | null

const ACTION_LABELS: Record<UserActionId, string> = {
  'resend-invitation': 'Renvoyer invitation',
  'send-password-reset': 'Envoyer reset password',
  'update-email': 'Modifier email',
  'change-role': 'Changer role',
  'change-establishment': 'Changer etablissement',
  'soft-delete': 'Archiver',
  restore: 'Restaurer',
  'hard-delete': 'Supprimer definitivement',
}

const ACTION_ICONS: Record<UserActionId, React.ReactNode> = {
  'resend-invitation': <RefreshCw className="w-3.5 h-3.5" />,
  'send-password-reset': <KeyRound className="w-3.5 h-3.5" />,
  'update-email': <Mail className="w-3.5 h-3.5" />,
  'change-role': <ShieldCheck className="w-3.5 h-3.5" />,
  'change-establishment': <Building2 className="w-3.5 h-3.5" />,
  'soft-delete': <UserMinus className="w-3.5 h-3.5" />,
  restore: <ArchiveRestore className="w-3.5 h-3.5" />,
  'hard-delete': <Trash2 className="w-3.5 h-3.5" />,
}

export function UserActionsMenu({
  user,
  callerRole,
  callerId,
  callerEstablishmentId,
  accessToken,
  establishments = [],
  onActionComplete,
}: UserActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const actions = getAvailableUserActions({
    user,
    callerRole,
    callerId,
    callerEstablishmentId,
  })
  const assignableRoles = getAssignableRoles(callerRole)

  if (actions.length === 0) {
    return <span className="text-xs text-[var(--color-text-subtle)]">Lecture seule</span>
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      setSuccess(successMessage)
      setOpen(false)
      setModal(null)
      onActionComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function openModal(kind: ModalKind) {
    setError(null)
    setSuccess(null)
    setOpen(false)
    setModal(kind)
  }

  function handleAction(action: UserActionId) {
    if (action === 'resend-invitation') {
      void runAction(
        () => resendInvitation({ data: { accessToken, userId: user.id } }),
        'Invitation renvoyee.',
      )
      return
    }
    if (action === 'send-password-reset') {
      void runAction(
        () => sendPasswordReset({ data: { accessToken, userId: user.id } }),
        'Email de reset envoye.',
      )
      return
    }
    if (action === 'restore') {
      void runAction(
        () => restoreUser({ data: { accessToken, userId: user.id } }),
        'Utilisateur restaure.',
      )
      return
    }
    if (action === 'update-email') openModal('email')
    if (action === 'change-role') openModal('role')
    if (action === 'change-establishment') openModal('establishment')
    if (action === 'soft-delete') openModal('soft-delete')
    if (action === 'hard-delete') openModal('hard-delete')
  }

  return (
    <div className="relative flex items-center justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Actions pour ${user.email}`}
        onClick={() => {
          setOpen((value) => !value)
          setError(null)
          setSuccess(null)
        }}
        iconLeft={<MoreVertical className="w-4 h-4" />}
      />

      {open && (
        <div className="absolute right-0 top-9 z-30 w-56 rounded-lg border border-[var(--color-border)] bg-white p-1 shadow-lg">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={submitting}
              onClick={() => handleAction(action)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              <span className={action === 'hard-delete' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}>
                {ACTION_ICONS[action]}
              </span>
              <span className={action === 'hard-delete' ? 'text-[var(--color-danger)]' : ''}>
                {ACTION_LABELS[action]}
              </span>
            </button>
          ))}
          {error && <p className="px-3 py-2 text-xs font-medium text-[var(--color-danger)]">{error}</p>}
          {success && <p className="px-3 py-2 text-xs font-medium text-[var(--color-success-fg)]">{success}</p>}
        </div>
      )}

      {modal === 'email' && (
        <UpdateUserEmailModal
          user={user}
          submitting={submitting}
          error={error}
          onCancel={() => setModal(null)}
          onConfirm={(newEmail) =>
            void runAction(
              () => updateUserEmail({ data: { accessToken, userId: user.id, newEmail } }),
              'Email mis a jour.',
            )
          }
        />
      )}

      {modal === 'role' && (
        <ChangeUserRoleModal
          user={user}
          roles={assignableRoles}
          submitting={submitting}
          error={error}
          onCancel={() => setModal(null)}
          onConfirm={(newRole) =>
            void runAction(
              () => changeUserRole({ data: { accessToken, userId: user.id, newRole } }),
              'Role mis a jour.',
            )
          }
        />
      )}

      {modal === 'establishment' && (
        <ChangeUserEstablishmentModal
          user={user}
          establishments={establishments}
          submitting={submitting}
          error={error}
          onCancel={() => setModal(null)}
          onConfirm={(newEstablishmentId) =>
            void runAction(
              () =>
                changeUserEstablishment({
                  data: { accessToken, userId: user.id, newEstablishmentId },
                }),
              'Etablissement mis a jour.',
            )
          }
        />
      )}

      {modal === 'soft-delete' && (
        <ConfirmDeleteUserModal
          user={user}
          submitting={submitting}
          error={error}
          onCancel={() => setModal(null)}
          onConfirm={() =>
            void runAction(
              () => softDeleteUser({ data: { accessToken, userId: user.id } }),
              'Utilisateur archive.',
            )
          }
        />
      )}

      {modal === 'hard-delete' && (
        <HardDeleteUserModal
          user={user}
          submitting={submitting}
          error={error}
          onCancel={() => setModal(null)}
          onConfirm={(confirmEmail) =>
            void runAction(
              () => hardDeleteUser({ data: { accessToken, userId: user.id, confirmEmail } }),
              'Utilisateur supprime definitivement.',
            )
          }
        />
      )}
    </div>
  )
}
