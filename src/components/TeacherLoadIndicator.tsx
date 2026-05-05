import { cn } from '@/lib/cn'
import { Badge } from './ui/Badge'

interface TeacherLoadIndicatorProps {
  load: number
  threshold: number
}

export function TeacherLoadIndicator({ load, threshold }: TeacherLoadIndicatorProps) {
  const pct = Math.min(100, Math.round((load / Math.max(threshold, 1)) * 100))
  const over = load > threshold
  const tone = over ? 'danger' : pct >= 80 ? 'warning' : 'success'
  const color =
    tone === 'danger'
      ? 'bg-[var(--color-danger)]'
      : tone === 'warning'
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-success)]'

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Badge tone={tone} dot>
        {load}/{threshold}
      </Badge>
    </div>
  )
}
