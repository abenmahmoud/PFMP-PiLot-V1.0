import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Label, Select } from '@/components/ui/Field'
import type { UserRowEnriched } from '@/server/users.functions'

export interface UserEstablishmentOption {
  id: string
  name: string
}

interface ChangeUserEstablishmentModalProps {
  user: UserRowEnriched
  establishments: UserEstablishmentOption[]
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (establishmentId: string | null) => void
}

export function ChangeUserEstablishmentModal({
  user,
  establishments,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ChangeUserEstablishmentModalProps) {
  const [establishmentId, setEstablishmentId] = useState(user.establishment_id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle icon={<Building2 className="w-4 h-4" />}>Changer d'etablissement</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Action superadmin. L'utilisateur sera rattache au tenant selectionne.
          </p>
          <div>
            <Label htmlFor="change-user-establishment">Etablissement</Label>
            <Select
              id="change-user-establishment"
              value={establishmentId}
              onChange={(event) => setEstablishmentId(event.target.value)}
            >
              <option value="">Aucun etablissement</option>
              {establishments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <FieldHint>Actuel : {user.establishment_name ?? 'Aucun'}</FieldHint>
          </div>
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(establishmentId || null)}
              disabled={submitting}
            >
              {submitting ? 'Mise a jour...' : 'Confirmer'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
