import { createFileRoute, redirect } from '@tanstack/react-router'
import { Download, FileSpreadsheet, FileText, Archive } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/exports')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/exports' })
  },
  component: ExportsPage,
})

const PRESETS = [
  { title: 'Élèves par classe', desc: 'Liste, statut stage, entreprise, référent.', icon: FileSpreadsheet, formats: ['CSV'] },
  { title: 'Élèves par période', desc: 'Tous les élèves d\'une PFMP avec affectation.', icon: FileSpreadsheet, formats: ['CSV'] },
  { title: 'Suivi par professeur', desc: 'Liste des élèves suivis et visites réalisées.', icon: FileSpreadsheet, formats: ['CSV'] },
  { title: 'Fiche stage par élève', desc: 'Document synthétique consolidé.', icon: FileText, formats: ['PDF (à venir)'] },
  { title: 'Documents archivés', desc: 'Tous les comptes rendus et attestations.', icon: Archive, formats: ['ZIP (à venir)'] },
]

export function ExportsPage() {
  return (
    <AppLayout
      title="Exports"
      subtitle="CSV disponible immédiatement · PDF et ZIP en cours d'intégration"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESETS.map((p) => {
          const Icon = p.icon
          return (
            <Card key={p.title}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Icon className="w-4 h-4" />}>{p.title}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{p.desc}</p>
                </div>
              </CardHeader>
              <CardBody className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {p.formats.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <Button size="sm" iconLeft={<Download className="w-4 h-4" />}>
                  Exporter
                </Button>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}
