import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { OfflineSyncResult } from '@/lib/offlineQueue'

export function SyncStatusModal({
  open,
  syncing,
  result,
  onClose,
}: {
  open: boolean
  syncing: boolean
  result: OfflineSyncResult | null
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle icon={syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}>
            Synchronisation terrain
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {syncing ? (
            <p className="text-sm text-[var(--color-text-muted)]">Envoi des actions hors-ligne en cours...</p>
          ) : result ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                {result.succeeded} action(s) synchronisee(s)
              </p>
              {result.failed > 0 && (
                <p className="flex items-center gap-2 text-amber-700">
                  <XCircle className="w-4 h-4" />
                  {result.failed} action(s) restent en attente
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Aucune synchronisation lancee.</p>
          )}
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
