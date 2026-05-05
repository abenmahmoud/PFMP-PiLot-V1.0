import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 pt-5 pb-3 flex items-start justify-between gap-3', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, children, icon }: PropsWithChildren<{ className?: string; icon?: React.ReactNode }>) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon && <span className="text-[var(--color-text-muted)]">{icon}</span>}
      <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
        {children}
      </h3>
    </div>
  )
}

export function CardDescription({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={cn('text-sm text-[var(--color-text-muted)]', className)}>
      {children}
    </p>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/40 rounded-b-xl flex items-center justify-between',
        className,
      )}
      {...props}
    />
  )
}
