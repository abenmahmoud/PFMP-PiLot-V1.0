import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label } from '@/components/ui/Field'
import type { UserRowEnriched } from '@/server/users.functions'

interface UpdateUserEmailModalProps {
  user: UserRowEnriched
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (email: string) => void
}

export function UpdateUserEmailModal({
  user,
  submitting,
  error,
  onCancel,
  onConfirm,
}: UpdateUserEmailModalProps) {
  const [email, setEmail] = useState(user.email)
  const isConfirmed = Boolean(user.email_confirmed_at)
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle icon={<Mail className="w-4 h-4" />}>Modifier l'email</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Cette correction est autorisee uniquement tant que l'utilisateur n'a pas encore
            confirme son invitation.
          </p>
          <div>
            <Label htmlFor="update-user-email">Nouvel email</Label>
            <Input
              id="update-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isConfirmed || submitting}
            />
            <FieldHint>
              {isConfirmed
                ? "Email confirme : l'utilisateur doit le modifier depuis son compte."
                : 'Le lien invitation pointera ensuite vers ce nouvel email.'}
            </FieldHint>
          </div>
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(email.trim())}
              disabled={isConfirmed || !isValid || submitting}
            >
              {submitting ? 'Mise a jour...' : 'Confirmer'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
