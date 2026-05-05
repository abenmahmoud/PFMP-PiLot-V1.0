import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, Plus } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { classes, profiles, students } from '@/data/demo'

export const Route = createFileRoute('/classes')({ component: ClassesPage })

function ClassesPage() {
  return (
    <AppLayout
      title="Classes"
      subtitle={`${classes.length} classes · année 2025-2026`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Nouvelle classe</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const inClass = students.filter((s) => s.classId === c.id)
          const noStage = inClass.filter((s) => s.stageStatus === 'no_stage').length
          const principal = profiles.find((p) => p.id === c.principalId)
          return (
            <Card key={c.id}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Users className="w-4 h-4" />}>{c.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{c.formation}</p>
                </div>
                <Badge tone="brand">{c.level}</Badge>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Élèves</span>
                  <span className="font-medium">{inClass.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Sans stage</span>
                  <Badge tone={noStage === 0 ? 'success' : 'warning'}>{noStage}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Prof. principal</span>
                  <span className="font-medium">
                    {principal ? `${principal.firstName} ${principal.lastName}` : '—'}
                  </span>
                </div>
                <Link
                  to="/students"
                  className="inline-flex h-8 items-center px-3 mt-1 rounded-md text-xs font-medium text-[var(--color-brand-700)] bg-[var(--color-brand-50)] hover:bg-[var(--color-brand-100)]"
                >
                  Voir les élèves
                </Link>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}
