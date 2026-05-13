import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface KpiCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
  delta?: { label: string; tone: 'up' | 'down' | 'neutral' }
}

export function KpiCard({ label, value, hint, icon, delta }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            {value}
          </p>
        </div>
        {icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            {icon}
          </span>
        )}
      </div>
      {(hint || delta) && (
        <div className="mt-3 flex min-h-5 items-center justify-between gap-2 text-xs">
          {hint && <span className="text-[var(--color-text-muted)]">{hint}</span>}
          {delta && <DeltaBadge tone={delta.tone}>{delta.label}</DeltaBadge>}
        </div>
      )}
    </div>
  )
}

function DeltaBadge({
  tone,
  children,
}: {
  tone: 'up' | 'down' | 'neutral'
  children: ReactNode
}) {
  const Icon = tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
        tone === 'up' && 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
        tone === 'down' && 'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)]',
        tone === 'neutral' && 'bg-[var(--color-muted)] text-[var(--color-text-muted)]',
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  )
}

