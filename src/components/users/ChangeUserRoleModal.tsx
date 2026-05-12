import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Label, Select } from '@/components/ui/Field'
import type { UserRole } from '@/lib/database.types'
import type { UserRowEnriched } from '@/server/users.functions'
import { ROLE_LABELS } from '@/types'

interface ChangeUserRoleModalProps {
  user: UserRowEnriched
  roles: UserRole[]
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (role: UserRole) => void
}

export function ChangeUserRoleModal({
  user,
  roles,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ChangeUserRoleModalProps) {
  const [role, setRole] = useState<UserRole>(roles.includes(user.role) ? user.role : roles[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle icon={<ShieldCheck className="w-4 h-4" />}>Changer le role</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Modifier le role de <strong>{user.email}</strong>. Les permissions effectives restent
            controlees cote serveur.
          </p>
          <div>
            <Label htmlFor="change-user-role">Nouveau role</Label>
            <Select
              id="change-user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABELS[item]}
                </option>
              ))}
            </Select>
            <FieldHint>Role actuel : {ROLE_LABELS[user.role]}</FieldHint>
          </div>
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button type="button" onClick={() => onConfirm(role)} disabled={submitting}>
              {submitting ? 'Mise a jour...' : 'Confirmer'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
