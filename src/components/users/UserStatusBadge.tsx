import { Badge } from '@/components/ui/Badge'

interface UserStatusBadgeProps {
  emailConfirmedAt: string | null
  archivedAt: string | null
}

export function UserStatusBadge({ emailConfirmedAt, archivedAt }: UserStatusBadgeProps) {
  if (archivedAt) {
    return (
      <Badge tone="neutral" dot>
        Archive
      </Badge>
    )
  }

  if (!emailConfirmedAt) {
    return (
      <Badge tone="warning" dot>
        Invite - en attente
      </Badge>
    )
  }

  return (
    <Badge tone="success" dot>
      Actif
    </Badge>
  )
}
