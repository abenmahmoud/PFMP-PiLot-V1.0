import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label } from '@/components/ui/Field'
import type { UserRowEnriched } from '@/server/users.functions'

interface HardDeleteUserModalProps {
  user: UserRowEnriched
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (confirmEmail: string) => void
}

export function HardDeleteUserModal({
  user,
  submitting,
  error,
  onCancel,
  onConfirm,
}: HardDeleteUserModalProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const canSubmit = confirmEmail === user.email

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg border-red-200">
        <CardHeader>
          <CardTitle icon={<AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />}>
            Suppression definitive
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-fg)]">
            Cette action est irreversible. Le compte Auth, le profil applicatif et les roles
            seront supprimes definitivement.
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <p className="font-medium text-[var(--color-text)]">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-[var(--color-text-muted)]">{user.email}</p>
            <p className="text-[var(--color-text-muted)]">Role : {user.role}</p>
            <p className="text-[var(--color-text-muted)]">
              Etablissement : {user.establishment_name ?? 'Aucun'}
            </p>
          </div>

          <div>
            <Label htmlFor="hard-delete-confirm-email">Tapez l'email exact pour confirmer</Label>
            <Input
              id="hard-delete-confirm-email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder={user.email}
              autoComplete="off"
            />
            <FieldHint>{user.email}</FieldHint>
          </div>

          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => onConfirm(confirmEmail)}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Suppression...' : 'Supprimer definitivement'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
