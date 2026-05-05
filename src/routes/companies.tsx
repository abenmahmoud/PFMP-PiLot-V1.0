import { createFileRoute } from '@tanstack/react-router'
import { Plus, Building2 } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { companies, tutors } from '@/data/demo'

export const Route = createFileRoute('/companies')({ component: CompaniesPage })

const RELIABILITY: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  high: { label: 'Fiable', tone: 'success' },
  medium: { label: 'Standard', tone: 'neutral' },
  low: { label: 'À surveiller', tone: 'warning' },
  unknown: { label: 'Inconnu', tone: 'neutral' },
}

function CompaniesPage() {
  return (
    <AppLayout
      title="Entreprises et tuteurs"
      subtitle={`${companies.length} entreprises · ${tutors.length} tuteurs`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Ajouter</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.map((c) => {
          const r = RELIABILITY[c.reliability]
          const ts = tutors.filter((t) => t.companyId === c.id)
          return (
            <Card key={c.id}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Building2 className="w-4 h-4" />}>{c.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {c.address}, {c.zipCode} {c.city}
                  </p>
                </div>
                <Badge tone={r.tone}>{r.label}</Badge>
              </CardHeader>
              <CardBody className="text-sm space-y-2">
                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{c.sector}</span>
                  <span>·</span>
                  <span>{c.studentsHosted} élèves accueillis</span>
                  {c.phone && (
                    <>
                      <span>·</span>
                      <span>{c.phone}</span>
                    </>
                  )}
                </div>
                {c.internalNotes && (
                  <p className="text-xs text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-md px-2 py-1.5">
                    {c.internalNotes}
                  </p>
                )}
                <div className="border-t border-[var(--color-border)] pt-2 mt-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
                    Tuteurs
                  </p>
                  {ts.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">Aucun tuteur enregistré.</p>
                  ) : (
                    <ul className="space-y-1">
                      {ts.map((t) => (
                        <li key={t.id} className="text-xs flex justify-between">
                          <span className="font-medium">
                            {t.firstName} {t.lastName}
                          </span>
                          <span className="text-[var(--color-text-muted)] truncate ml-2">
                            {t.function}
                            {t.email ? ` · ${t.email}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}
