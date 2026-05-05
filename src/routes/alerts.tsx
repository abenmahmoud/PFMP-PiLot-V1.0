import { createFileRoute } from '@tanstack/react-router'
import { Bell, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertList } from '@/components/AlertList'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { alerts as allAlerts } from '@/data/demo'

export const Route = createFileRoute('/alerts')({ component: AlertsPage })

function AlertsPage() {
  const me = useCurrentUser()
  const myAlerts =
    me.role === 'superadmin'
      ? allAlerts
      : allAlerts.filter((a) => a.establishmentId === me.establishmentId)

  const groups: Array<{ tone: string; title: string; severity: 'urgent' | 'problem' | 'vigilance' }> = [
    { tone: 'urgent', title: 'Urgent', severity: 'urgent' },
    { tone: 'problem', title: 'À traiter', severity: 'problem' },
    { tone: 'vigilance', title: 'Vigilance', severity: 'vigilance' },
  ]

  return (
    <AppLayout
      title="Alertes"
      subtitle="Élèves sans stage, visites en retard, documents manquants, surcharge…"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const items = myAlerts.filter((a) => a.severity === g.severity)
          return (
            <Card key={g.severity}>
              <CardHeader>
                <CardTitle icon={<Bell className="w-4 h-4" />}>
                  {g.title} · {items.length}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <AlertList alerts={items} compact emptyMessage="Aucune alerte." />
              </CardBody>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle icon={<Sparkles className="w-4 h-4" />}>Détection IA — bientôt</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Le moteur IA détectera des signaux faibles : élèves en repli, tuteurs peu réactifs,
            classes en retard, anomalies de saisie, établissements clients en perte d'activité.
            Toute alerte IA sera doublée d'une explication et d'une action recommandée. Validation
            humaine obligatoire avant diffusion ou message externe.
          </p>
        </CardBody>
      </Card>
    </AppLayout>
  )
}
