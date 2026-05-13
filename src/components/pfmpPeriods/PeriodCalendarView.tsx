import { CalendarDays } from 'lucide-react'
import type { PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { PeriodStatusBadge } from '@/components/StatusBadge'

export function PeriodCalendarView({ periods }: { periods: PfmpPeriodWithStats[] }) {
  if (periods.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<CalendarDays className="w-4 h-4" />}>Calendrier PFMP</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {periods.slice(0, 6).map((item) => (
            <div key={item.period.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.period.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(item.period.start_date)} - {formatDate(item.period.end_date)}
                  {item.class ? ` - ${item.class.name}` : ''}
                </p>
              </div>
              <PeriodStatusBadge status={item.period.status} />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}
