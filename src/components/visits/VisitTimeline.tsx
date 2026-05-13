import { CheckCircle2, Circle, Flag } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { VisitRow } from '@/lib/database.types'

const STEPS = [
  { key: 'planned', label: 'Planifiee' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminee' },
]

export function VisitTimeline({ visit }: { visit: VisitRow }) {
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.key === visit.status))
  return (
    <div className="flex flex-wrap gap-3">
      {STEPS.map((step, index) => {
        const done = index <= activeIndex || visit.status === 'completed'
        return (
          <div key={step.key} className={cn('flex items-center gap-2 text-sm', done ? 'text-emerald-700' : 'text-[var(--color-text-muted)]')}>
            {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            {step.label}
          </div>
        )
      })}
      {visit.flagged_for_review && (
        <div className="flex items-center gap-2 text-sm text-red-700">
          <Flag className="w-4 h-4" />
          A revoir
        </div>
      )}
    </div>
  )
}
