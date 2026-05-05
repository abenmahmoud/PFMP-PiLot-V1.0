import { createFileRoute } from '@tanstack/react-router'
import { Plus, UserCog } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { DataTable } from '@/components/DataTable'
import { Button } from '@/components/ui/Button'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import { teachers, classes } from '@/data/demo'

export const Route = createFileRoute('/teachers')({ component: TeachersPage })

function TeachersPage() {
  return (
    <AppLayout
      title="Professeurs"
      subtitle={`${teachers.length} professeurs · seuil charge configuré à 6 élèves`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Ajouter</Button>}
    >
      <DataTable
        rows={teachers}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Professeur',
            render: (t) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center text-xs font-semibold">
                  {t.firstName[0]}
                  {t.lastName[0]}
                </div>
                <div>
                  <p className="font-medium">
                    {t.firstName} {t.lastName}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{t.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'classes',
            header: 'Classes',
            hideOnMobile: true,
            render: (t) =>
              t.classes
                .map((id) => classes.find((c) => c.id === id)?.name)
                .filter(Boolean)
                .join(', '),
          },
          {
            key: 'load',
            header: 'Charge',
            render: (t) => <TeacherLoadIndicator load={t.studentLoad} threshold={6} />,
          },
        ]}
        empty={<UserCog className="w-5 h-5" />}
      />
    </AppLayout>
  )
}
