import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Users, Activity, AlertTriangle, TrendingDown, ArrowUpRight } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { StatCard } from '@/components/StatCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertList } from '@/components/AlertList'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Badge } from '@/components/ui/Badge'
import { alerts, establishments, pfmpPeriods, students, visits, documents } from '@/data/demo'

export const Route = createFileRoute('/superadmin/')({ component: SuperadminPage })

function SuperadminPage() {
  return (
    <AppLayout
      title="Vue globale Superadmin"
      subtitle="Pilotage multi-établissement de PFMP Pilot AI"
    >
      <RoleGuard allow={['superadmin']}>
        <SuperContent />
      </RoleGuard>
    </AppLayout>
  )
}

function SuperContent() {
  const active = establishments.filter((e) => e.active).length
  const inactive = establishments.length - active
  const visitsTotal = visits.length
  const visitsLate = alerts.filter((a) => a.type === 'visit_late').length
  const missingDocs = documents.filter((d) => d.status === 'missing').length
  const lowActivity = establishments.filter((e) => e.activityScore < 40).length

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Établissements"
          value={establishments.length}
          icon={<Building2 className="w-4 h-4" />}
          delta={{ value: `${active} actifs · ${inactive} inactif`, tone: 'neutral' }}
        />
        <StatCard
          label="Élèves suivis"
          value={establishments.reduce((s, e) => s + e.studentCount, 0)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Périodes PFMP"
          value={pfmpPeriods.length}
          icon={<Activity className="w-4 h-4" />}
          hint={`${students.length} élèves dans la démo`}
        />
        <StatCard
          label="Établissements à relancer"
          value={lowActivity}
          icon={<TrendingDown className="w-4 h-4" />}
          delta={{ value: 'score < 40/100', tone: 'down' }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>Établissements à relancer</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">Tri par score d'activité croissant</p>
            </div>
            <Link
              to="/superadmin/establishments"
              className="text-xs font-medium text-[var(--color-brand-700)] inline-flex items-center gap-1"
            >
              Tout voir <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-[var(--color-border)]">
              {[...establishments]
                .sort((a, b) => a.activityScore - b.activityScore)
                .slice(0, 4)
                .map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {e.city} · {e.studentCount} élèves · {e.userCount} utilisateurs
                      </p>
                    </div>
                    <ScoreBadge score={e.activityScore} />
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes globales</CardTitle>
          </CardHeader>
          <CardBody>
            <AlertList alerts={alerts.slice(0, 5)} compact />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-6">
        <StatCard label="Visites enregistrées" value={visitsTotal} hint="toutes périodes confondues" />
        <StatCard label="Visites en retard" value={visitsLate} delta={{ value: 'à traiter', tone: 'down' }} />
        <StatCard label="Documents manquants" value={missingDocs} delta={{ value: 'multi-établissement', tone: 'down' }} />
      </section>

      <section className="mt-6">
        <AiAssistantPanel
          type="superadmin"
          title="Assistant IA Superadmin"
          description="Analysez l'usage multi-établissement, détectez les clients à risque, préparez vos relances."
          examples={[
            'Quels établissements sont peu actifs ?',
            'Génère un message de relance pour Marie Curie',
            'Prépare un rapport hebdomadaire',
            'Quels clients risquent d\'abandonner ?',
          ]}
        />
      </section>
    </>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'
  return (
    <Badge tone={tone} dot>
      {score}/100
    </Badge>
  )
}
