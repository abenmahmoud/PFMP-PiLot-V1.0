import { CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useOfflineSync } from '@/lib/offlineQueue'

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={isOnline ? 'success' : 'warning'} dot>
        {isOnline ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        {isOnline ? 'En ligne' : 'Hors-ligne'}
      </Badge>
      {pendingCount > 0 && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          iconLeft={<RefreshCw className={syncing ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />}
          onClick={() => syncNow()}
          disabled={syncing}
        >
          {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
        </Button>
      )}
    </div>
  )
}
