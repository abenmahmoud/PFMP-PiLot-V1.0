import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Building2,
  Download,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ActivityFeedItem } from '@/components/superadmin/ActivityFeedItem'
import { ComplianceChecks } from '@/components/superadmin/ComplianceChecks'
import { EstablishmentRow } from '@/components/superadmin/EstablishmentRow'
import { KpiCard } from '@/components/superadmin/KpiCard'
import { PlacementTrendChart } from '@/components/superadmin/PlacementTrendChart'
import { StudentRiskCard } from '@/components/superadmin/StudentRiskCard'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { establishments as demoEstablishments } from '@/data/demo'
import {
  getActivityFeed,
  getCrossEstablishmentInsights,
  getEstablishmentBreakdown,
  getGlobalKpis,
  getMonthlyTrends,
  type CrossEstablishmentInsights,
  type EnrichedAuditLog,
  type EstablishmentBreakdownItem,
  type GlobalKpis,
  type MonthlyTrends,
} from '@/server/superadminDashboard.functions'

export const Route = createFileRoute('/superadmin/dashboard')({
  component: SuperadminDashboardPage,
})

interface DashboardData {
  kpis: GlobalKpis
  breakdown: EstablishmentBreakdownItem[]
  insights: CrossEstablishmentInsights
  activity: EnrichedAuditLog[]
  trends: MonthlyTrends
}

function SuperadminDashboardPage() {
  if (isDemoMode()) return <DemoDashboard />
  return <SupabaseDashboard />
}

function SupabaseDashboard() {
  const auth = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const accessToken = auth.session?.access_token
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [kpis, breakdown, insights, activity, trends] = await Promise.all([
        getGlobalKpis({ data: { accessToken } }),
        getEstablishmentBreakdown({ data: { accessToken } }),
        getCrossEstablishmentInsights({ data: { accessToken } }),
        getActivityFeed({ data: { accessToken, limit: 50, establishmentId: null, action: null } }),
        getMonthlyTrends({ data: { accessToken } }),
      ])
      setData({ kpis, breakdown, insights, activity, trends })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.loading) return
    load()
  }, [auth.loading, auth.session?.access_token])

  if (auth.loading || loading) {
    return (
      <AppLayout title="Vue globale" subtitle="Cockpit superadmin multi-etablissements">
        <EmptyState title="Chargement du cockpit" description="Calcul des KPIs groupe en cours." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Vue globale" subtitle="Cockpit superadmin">
        <EmptyState
          icon={<Shield className="h-5 w-5" />}
          title="Session requise"
          description="Connectez-vous avec un compte superadmin."
          action={
            <Link to="/admin/login">
              <Button>Connexion administration</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.profile.role !== 'superadmin') {
    return (
      <AppLayout title="Vue globale" subtitle="Cockpit superadmin">
        <EmptyState
          icon={<Shield className="h-5 w-5" />}
          title="Acces reserve aux superadmins"
          description="Cette console affiche les donnees de tous les etablissements."
        />
      </AppLayout>
    )
  }

  if (error || !data) {
    return (
      <AppLayout title="Vue globale" subtitle="Cockpit superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Impossible de charger le cockpit"
          description={error ?? 'Aucune donnee retournee.'}
          action={<Button onClick={load}>Reessayer</Button>}
        />
      </AppLayout>
    )
  }

  return <DashboardContent data={data} onRefresh={load} refreshing={loading} />
}

function DashboardContent({
  data,
  onRefresh,
  refreshing,
}: {
  data: DashboardData
  onRefresh: () => void
  refreshing: boolean
}) {
  const topEstablishments = [...data.breakdown]
    .sort((a, b) => b.pending_actions - a.pending_actions || a.placement_rate - b.placement_rate)
    .slice(0, 8)
  const rectoratReport = () => window.print()

  return (
    <AppLayout
      title="Vue Globale"
      subtitle="PFMP Pilot AI Superadmin · pilotage groupe scolaire"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Download className="h-4 w-4" />}
            onClick={rectoratReport}
          >
            Rapport rectorat
          </Button>
          <Button
            size="sm"
            iconLeft={<RefreshCw className="h-4 w-4" />}
            onClick={onRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Lycees"
            value={data.kpis.total_establishments}
            icon={<Building2 className="h-4 w-4" />}
            hint="tenants suivis"
          />
          <KpiCard
            label="Eleves"
            value={data.kpis.total_students}
            icon={<Users className="h-4 w-4" />}
            hint="actifs"
          />
          <KpiCard
            label="Placements"
            value={data.kpis.total_placements_active}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="actifs ou completes"
          />
          <KpiCard
            label="Taux groupe"
            value={`${data.kpis.placement_rate}%`}
            icon={<Shield className="h-4 w-4" />}
            delta={{
              label: data.kpis.alerts_count > 0 ? `${data.kpis.alerts_count} alertes` : 'stable',
              tone: data.kpis.alerts_count > 0 ? 'down' : 'up',
            }}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <PlacementTrendChart trends={data.trends} />
          <ComplianceChecks checks={data.insights.compliance_status} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Comparaison inter-etablissements</CardTitle>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Taux de placement, alertes et dernieres activites par lycee.
                </p>
              </div>
              <Link
                to="/superadmin/establishments"
                className="text-xs font-medium text-[var(--color-brand-700)] underline underline-offset-2"
              >
                Tous les etablissements
              </Link>
            </CardHeader>
            <CardBody>
              {topEstablishments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Aucun etablissement.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {topEstablishments.map((item) => (
                    <EstablishmentRow key={item.establishment.id} item={item} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eleves a risque</CardTitle>
              <Badge tone={data.insights.students_at_risk.length > 0 ? 'warning' : 'success'}>
                {data.insights.students_at_risk.length}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.insights.students_at_risk.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Aucun eleve sans stage a J-10 sur les periodes a venir.
                </p>
              ) : (
                data.insights.students_at_risk
                  .slice(0, 5)
                  .map((risk) => <StudentRiskCard key={`${risk.studentId}-${risk.periodId}`} risk={risk} />)
              )}
            </CardBody>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Top entreprises partagees</CardTitle>
            </CardHeader>
            <CardBody>
              {data.insights.top_companies_shared.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Pas encore d'entreprise commune a plusieurs lycees.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.insights.top_companies_shared.slice(0, 10).map((company) => (
                    <li key={company.name} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{company.name}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {company.establishments.map((item) => item.name).join(' · ')}
                          </p>
                        </div>
                        <Badge tone="brand">{company.establishments.length} lycees</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flux d'activite temps reel</CardTitle>
              <Link
                to="/superadmin/audit"
                className="text-xs font-medium text-[var(--color-brand-700)] underline underline-offset-2"
              >
                Audit complet
              </Link>
            </CardHeader>
            <CardBody>
              {data.activity.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune activite recente.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.activity.slice(0, 8).map((item) => (
                    <ActivityFeedItem key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </AppLayout>
  )
}

function DemoDashboard() {
  const demoData: DashboardData = {
    kpis: {
      total_establishments: demoEstablishments.length,
      total_students: demoEstablishments.reduce((sum, item) => sum + item.studentCount, 0),
      total_placements_active: 2870,
      placement_rate: 88.6,
      total_visits_planned: 420,
      total_visits_done: 315,
      top_companies_by_volume: [],
      alerts_count: 12,
    },
    breakdown: demoEstablishments.map((establishment, index) => ({
      establishment: {
        id: establishment.id,
        name: establishment.name,
        city: establishment.city,
        uai: establishment.uai ?? null,
        slug: establishment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        subdomain: null,
        custom_domain: null,
        domain_verified: true,
        primary_color: null,
        status: establishment.active ? 'active' : 'suspended',
        active: establishment.active,
        created_at: establishment.createdAt,
        updated_at: establishment.createdAt,
      },
      students: establishment.studentCount,
      placements: Math.round(establishment.studentCount * (0.75 + index * 0.03)),
      placement_rate: Math.min(96, 78 + index * 4),
      pending_actions: index + 1,
      last_activity: establishment.lastConnectionAt ?? null,
      classes: 4 + index,
      companies: establishment.companyCount ?? 0,
      teachers: establishment.userCount,
      alerts: index,
    })),
    insights: {
      top_companies_shared: [],
      top_referents_by_visits: [],
      students_at_risk: [],
      compliance_status: [
        { key: 'demo-admin', label: 'Admins etablissements', status: 'ok', detail: 'Tous les lycees demo ont un admin.' },
        { key: 'demo-audit', label: 'Audit logs', status: 'ok', detail: 'Journalisation active en demonstration.' },
        { key: 'demo-rgpd', label: 'RGPD', status: 'ok', detail: 'Donnees fictives RGPD-safe.' },
      ],
    },
    activity: [],
    trends: {
      placements_per_month: makeDemoTrend([12, 18, 22, 35, 41, 55, 64, 72, 90, 110, 128, 145]),
      visits_per_month: makeDemoTrend([4, 6, 8, 12, 18, 24, 30, 44, 48, 56, 61, 70]),
      new_companies_per_month: makeDemoTrend([2, 4, 5, 7, 8, 11, 12, 15, 18, 19, 22, 24]),
    },
  }
  return <DashboardContent data={demoData} onRefresh={() => window.location.reload()} refreshing={false} />
}

function makeDemoTrend(values: number[]): Array<{ month: string; count: number }> {
  const now = new Date()
  return values.map((count, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (values.length - index - 1), 1)
    return {
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      count,
    }
  })
}
