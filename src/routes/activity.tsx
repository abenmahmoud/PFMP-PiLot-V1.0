import { createFileRoute } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { activityLog } from '@/data/demo'

export const Route = createFileRoute('/activity')({ component: ActivityPage })

function ActivityPage() {
  return (
    <AppLayout
      title="Journal d'activité"
      subtitle="Connexions, imports, créations, validations, générations IA, exports"
    >
      <Card>
        <CardHeader>
          <CardTitle icon={<History className="w-4 h-4" />}>Audit logs</CardTitle>
        </CardHeader>
        <CardBody>
          <ActivityTimeline entries={activityLog} />
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Le journal sera persisté dans la table `audit_logs`. Chaque action sensible
            (changement de rôle, validation de compte rendu, génération IA, export) est
            enregistrée avec l'utilisateur et l'établissement concerné.
          </p>
        </CardBody>
      </Card>
    </AppLayout>
  )
}
