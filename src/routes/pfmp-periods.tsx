import { createFileRoute } from '@tanstack/react-router'
import { Plus, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { PeriodStatusBadge } from '@/components/StatusBadge'
import { classes, pfmpPeriods } from '@/data/demo'

export const Route = createFileRoute('/pfmp-periods')({ component: PeriodsPage })

function PeriodsPage() {
  return (
    <AppLayout
      title="Périodes PFMP"
      subtitle={`${pfmpPeriods.length} périodes · année 2025-2026`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Nouvelle période</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pfmpPeriods.map((p) => {
          const classNames = p.classIds
            .map((id) => classes.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(' · ')
          return (
            <Card key={p.id}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Calendar className="w-4 h-4" />}>{p.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {new Date(p.startDate).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(p.endDate).toLocaleDateString('fr-FR')} · {classNames}
                  </p>
                </div>
                <PeriodStatusBadge status={p.status} />
              </CardHeader>
              <CardBody className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Élèves" value={p.studentCount} />
                <Stat label="Affectés" value={`${p.assignmentRate}%`} />
                <Stat label="Visites" value={`${p.visitRate}%`} />
                <Stat label="Docs manquants" value={p.missingDocuments} className="col-span-3 sm:col-span-1" />
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}

function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-[var(--color-muted)]/50 px-3 py-2 ${className || ''}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  )
}
