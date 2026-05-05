import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, Network } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import { StageStatusBadge } from '@/components/StatusBadge'
import { classes, pfmpPeriods, students, teachers, companies } from '@/data/demo'

export const Route = createFileRoute('/assignments')({ component: AssignmentsPage })

function AssignmentsPage() {
  const [classFilter, setClassFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>(pfmpPeriods[1]?.id || 'all')
  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'

  const rows = students.filter((s) => {
    if (classFilter !== 'all' && s.classId !== classFilter) return false
    if (periodFilter !== 'all' && s.periodId !== periodFilter) return false
    return true
  })

  return (
    <AppLayout
      title="Affectations"
      subtitle="Élèves ↔ professeurs référents · seuil charge à 6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Network className="w-4 h-4" />}>Élèves</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Cliquez sur un élève pour modifier son professeur référent.
              </p>
            </div>
            <div className="flex gap-2">
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={filterSelect}>
                <option value="all">Toutes classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className={filterSelect}>
                <option value="all">Toutes périodes</option>
                {pfmpPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {rows.map((s) => {
                const ref = teachers.find((t) => t.id === s.referentId)
                const company = companies.find((c) => c.id === s.companyId)
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {classes.find((c) => c.id === s.classId)?.name}
                        {company ? ` · ${company.name}` : ' · Pas d\'entreprise'}
                      </p>
                    </div>
                    <StageStatusBadge status={s.stageStatus} />
                    <Badge tone={ref ? 'brand' : 'warning'}>
                      {ref ? `${ref.firstName} ${ref.lastName}` : 'Non affecté'}
                    </Badge>
                    <Button size="sm" variant="secondary">Affecter</Button>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Charge des professeurs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium truncate">
                  {t.firstName} {t.lastName}
                </span>
                <TeacherLoadIndicator load={t.studentLoad} threshold={6} />
              </div>
            ))}
            <p className="text-xs text-[var(--color-text-muted)] pt-2">
              Le seuil par professeur est configurable dans les paramètres établissement.
            </p>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
