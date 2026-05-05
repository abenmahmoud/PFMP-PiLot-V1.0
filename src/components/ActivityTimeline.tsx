import { LogIn, Upload, UserPlus, Network, ClipboardCheck, Sparkles, Download, Archive, Shield } from 'lucide-react'
import type { ActivityLogEntry } from '@/types'
import { profiles } from '@/data/demo'

const ICONS: Record<ActivityLogEntry['action'], typeof LogIn> = {
  login: LogIn,
  import: Upload,
  student_create: UserPlus,
  assignment_update: Network,
  visit_create: ClipboardCheck,
  report_validate: ClipboardCheck,
  ai_generate: Sparkles,
  export: Download,
  archive: Archive,
  role_change: Shield,
}

interface ActivityTimelineProps {
  entries: ActivityLogEntry[]
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  return (
    <ul className="space-y-3">
      {entries.map((e) => {
        const Icon = ICONS[e.action]
        const author = profiles.find((p) => p.id === e.userId)
        return (
          <li key={e.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">{e.description}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {author ? `${author.firstName} ${author.lastName}` : 'Système'} ·{' '}
                {new Date(e.createdAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
