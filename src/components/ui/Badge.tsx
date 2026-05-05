import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--color-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  brand: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)] border-emerald-200',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)] border-amber-200',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)] border-red-200',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)] border-sky-200',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: PropsWithChildren<{ tone?: BadgeTone; className?: string; dot?: boolean }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', {
            'bg-[var(--color-text-subtle)]': tone === 'neutral',
            'bg-[var(--color-brand-500)]': tone === 'brand',
            'bg-[var(--color-success)]': tone === 'success',
            'bg-[var(--color-warning)]': tone === 'warning',
            'bg-[var(--color-danger)]': tone === 'danger',
            'bg-[var(--color-info)]': tone === 'info',
          })}
        />
      )}
      {children}
    </span>
  )
}
