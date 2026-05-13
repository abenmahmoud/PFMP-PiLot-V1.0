import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { EnrichedAuditLog } from '@/server/superadminDashboard.functions'

export function ActivityFeedItem({ item }: { item: EnrichedAuditLog }) {
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
        <Activity className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-[var(--color-text)]">{item.description ?? item.action}</p>
          <Badge tone="neutral">{item.action}</Badge>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {item.establishment_name ?? 'Global'} · {item.user_name ?? 'Systeme'} ·{' '}
          {formatRelative(item.created_at)}
        </p>
      </div>
    </li>
  )
}

function formatRelative(value: string): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'maintenant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return new Date(value).toLocaleDateString('fr-FR')
}

