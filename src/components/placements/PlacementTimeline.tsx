import type { StageStatus } from '@/lib/database.types'
import { cn } from '@/lib/cn'

const STEPS: Array<{ status: StageStatus; label: string }> = [
  { status: 'no_stage', label: 'Recherche' },
  { status: 'found', label: 'Entreprise' },
  { status: 'confirmed', label: 'Validation' },
  { status: 'signed_convention', label: 'Convention' },
  { status: 'in_progress', label: 'En stage' },
  { status: 'completed', label: 'Termine' },
]

export function PlacementTimeline({ status }: { status: StageStatus }) {
  const normalized = status === 'draft'
    ? 'no_stage'
    : status === 'pending_convention'
      ? 'signed_convention'
      : status
  const index = normalized === 'cancelled' || normalized === 'interrupted'
    ? -1
    : Math.max(0, STEPS.findIndex((step) => step.status === normalized))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
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
      {(normalized === 'cancelled' || normalized === 'interrupted') && (
        <p className="col-span-2 sm:col-span-6 text-xs font-medium text-[var(--color-danger-fg)]">
          Placement annule ou interrompu.
        </p>
      )}
    </div>
  )
}
