import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { UserRowEnriched } from '@/server/users.functions'

interface ConfirmDeleteUserModalProps {
  user: UserRowEnriched
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteUserModal({
  user,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteUserModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle icon={<AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />}>
            Archiver cet utilisateur
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Le compte de <strong>{user.email}</strong> sera archive. Il ne sera plus affiche
            dans la liste active, mais pourra etre restaure depuis les archives.
          </p>
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button type="button" variant="danger" onClick={onConfirm} disabled={submitting}>
              {submitting ? 'Archivage...' : 'Archiver'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
