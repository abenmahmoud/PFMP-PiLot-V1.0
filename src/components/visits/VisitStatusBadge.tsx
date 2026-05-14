import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { VisitStatus } from '@/lib/database.types'

const LABELS: Record<VisitStatus, string> = {
  draft: 'Brouillon',
  validated: 'Validee',
  archived: 'Archivee',
  planned: 'Planifiee',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
  no_show: 'Absence',
}

const TONES: Record<VisitStatus, BadgeTone> = {
  draft: 'neutral',
  validated: 'success',
  archived: 'neutral',
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <Badge tone={TONES[status] ?? 'neutral'} dot>
      {LABELS[status] ?? status}
    </Badge>
  )
}
