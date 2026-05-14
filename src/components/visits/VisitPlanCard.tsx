import { Link } from '@tanstack/react-router'
import { CalendarClock, MapPin, Play } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { VisitStatusBadge } from '@/components/visits/VisitStatusBadge'
import type { FieldVisitWithRelations } from '@/server/visits.functions'

export function VisitPlanCard({ item }: { item: FieldVisitWithRelations }) {
  const scheduled = item.visit.scheduled_at ?? `${item.visit.date}T08:00:00`
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<CalendarClock className="w-4 h-4" />}>
          {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve'}
        </CardTitle>
        <VisitStatusBadge status={item.visit.status} />
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-[var(--color-text)]">{formatDateTime(scheduled)}</p>
          <p className="text-[var(--color-text-muted)]">{item.class?.name ?? 'Classe non renseignee'}</p>
          <p className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <MapPin className="w-3.5 h-3.5" />
            {item.company?.name ?? 'Entreprise non affectee'}
            {item.company?.city ? ` - ${item.company.city}` : ''}
          </p>
        </div>
        {item.visit.flagged_for_review && <Badge tone="danger">A revoir</Badge>}
        <div className="flex flex-wrap gap-2">
          <Link to="/prof/visits/$id" params={{ id: item.visit.id }}>
            <Button type="button" size="sm" iconLeft={<Play className="w-3.5 h-3.5" />}>
              Ouvrir
            </Button>
          </Link>
          {item.company?.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.company.address} ${item.company.city ?? ''}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] px-2.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-muted)]"
            >
              Navigation
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
