import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const fieldBase =
  'w-full bg-white border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-500)] transition-colors'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-[88px]', className)} {...props} />
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, 'pr-9 appearance-none bg-no-repeat bg-right', className)} {...props} />
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-[var(--color-text)] mb-1.5', className)}
      {...props}
    />
  )
}

export function FieldHint({
  className,
  ...props
}: { className?: string; children?: React.ReactNode }) {
  return (
    <p
      className={cn('mt-1 text-xs text-[var(--color-text-muted)]', className)}
      {...props}
    />
  )
}
