import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  delta?: { value: string; tone?: 'up' | 'down' | 'neutral' }
  icon?: ReactNode
  hint?: string
  className?: string
}

export function StatCard({ label, value, delta, icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
        {icon && (
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{value}</p>
        {delta && (
          <span
            className={cn('text-xs font-medium', {
              'text-[var(--color-success-fg)]': delta.tone === 'up',
              'text-[var(--color-danger-fg)]': delta.tone === 'down',
              'text-[var(--color-text-muted)]': !delta.tone || delta.tone === 'neutral',
            })}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  )
}
