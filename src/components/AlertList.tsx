import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { Alert } from '@/types'
import { AlertLevelBadge } from './StatusBadge'
import { cn } from '@/lib/cn'

const TYPE_LABELS: Record<Alert['type'], string> = {
  student_no_stage: 'Élève sans stage',
  missing_convention: 'Convention manquante',
  visit_late: 'Visite en retard',
  missing_attestation: 'Attestation manquante',
  teacher_overload: 'Professeur surchargé',
  stage_interrupted: 'Stage interrompu',
  company_watch: 'Entreprise à surveiller',
  low_activity_establishment: 'Établissement peu actif',
}

interface AlertListProps {
  alerts: Alert[]
  emptyMessage?: string
  compact?: boolean
}

function AlertLink({
  alert,
  children,
}: {
  alert: Alert
  children: React.ReactNode
}) {
  const baseCls = 'block hover:bg-[var(--color-muted)]/40 transition-colors'
  switch (alert.relatedEntity.type) {
    case 'student':
      return (
        <Link to="/students/$id" params={{ id: alert.relatedEntity.id }} className={baseCls}>
          {children}
        </Link>
      )
    case 'period':
      return (
        <Link to="/pfmp-periods" className={baseCls}>
          {children}
        </Link>
      )
    case 'teacher':
      return (
        <Link to="/teachers" className={baseCls}>
          {children}
        </Link>
      )
    case 'company':
      return (
        <Link to="/companies" className={baseCls}>
          {children}
        </Link>
      )
    case 'establishment':
      return (
        <Link to="/superadmin/establishments" className={baseCls}>
          {children}
        </Link>
      )
    default:
      return <div>{children}</div>
  }
}

export function AlertList({ alerts, emptyMessage = 'Aucune alerte 🎉', compact }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-sm text-[var(--color-text-muted)] py-6 text-center">{emptyMessage}</div>
    )
  }
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {alerts.map((a) => (
        <li key={a.id}>
          <AlertLink alert={a}>
            <div className={cn('flex items-start gap-3 py-3', compact ? 'px-0' : 'px-1')}>
              <div className="mt-0.5">
                <AlertLevelBadge level={a.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">{a.message}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {TYPE_LABELS[a.type]} · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-subtle)] mt-1" />
            </div>
          </AlertLink>
        </li>
      ))}
    </ul>
  )
}
