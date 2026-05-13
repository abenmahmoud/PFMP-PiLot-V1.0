import type { StageStatus } from '@/lib/database.types'
import { StageStatusBadge } from '@/components/StatusBadge'

export function PlacementStatusBadge({ status }: { status: StageStatus }) {
  return <StageStatusBadge status={status} />
}
