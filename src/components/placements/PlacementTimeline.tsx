import type { StageStatus } from '@/lib/database.types'
import { cn } from '@/lib/cn'

const STEPS: Array<{ status: StageStatus; label: string }> = [
  { status: 'draft', label: 'Brouillon' },
  { status: 'confirmed', label: 'Confirmé' },
  { status: 'in_progress', label: 'En stage' },
  { status: 'completed', label: 'Terminé' },
]

export function PlacementTimeline({ status }: { status: StageStatus }) {
  const index = status === 'cancelled' || status === 'interrupted'
    ? -1
    : Math.max(0, STEPS.findIndex((step) => step.status === status))

  return (
    <div className="grid grid-cols-4 gap-2">
      {STEPS.map((step, stepIndex) => {
        const active = index >= stepIndex
        return (
          <div key={step.status} className="min-w-0">
            <div
              className={cn(
                'h-1.5 rounded-full',
                active ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-border)]',
              )}
            />
            <p className={cn('mt-2 text-[11px] font-medium truncate', active ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]')}>
              {step.label}
            </p>
          </div>
        )
      })}
      {(status === 'cancelled' || status === 'interrupted') && (
        <p className="col-span-4 text-xs font-medium text-[var(--color-danger-fg)]">
          Placement annulé ou interrompu.
        </p>
      )}
    </div>
  )
}
