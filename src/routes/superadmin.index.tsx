import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Building2,
  Network,
  TrendingDown,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { StatCard } from '@/components/StatCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertList } from '@/components/AlertList'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchSuperadminOverview,
  type EstablishmentWithMetrics,
  type SuperadminOverview,
} from '@/services/superadmin'
import {
  alerts as demoAlerts,
  companies as demoCompanies,
  documents as demoDocuments,
  establishments as demoEstablishments,
  tutors as demoTutors,
  visits as demoVisits,
} from '@/data/demo'
import { PROFESSIONAL_FAMILY_LABELS, type ProfessionalFamily } from '@/types'
import type { AlertRow } from '@/lib/database.types'

export const Route = createFileRoute('/superadmin/')({ component: SuperadminPage })

const LOW_COMPANY_THRESHOLD = 8
const LOW_ACTIVITY_THRESHOLD = 40
const OVERVIEW_LOAD_TIMEOUT_MS = 12000
const AUTH_LOAD_TIMEOUT_MS = 8000

// --------------------------------------------------------------------------
// Routeur demo / Supabase
// --------------------------------------------------------------------------

function SuperadminPage() {
  if (isDemoMode()) {
    return (
      <AppLayout
        title="Vue globale Superadmin"
        subtitle="Pilotage multi-établissement de PFMP Pilot AI · démo"
      >
        <RoleGuard allow={['superadmin']}>
          <SuperadminDemoContent />
        </RoleGuard>
      </AppLayout>
    )
  }
  return <SuperadminSupabase />
}

// --------------------------------------------------------------------------
// Mode Supabase (prod)
// --------------------------------------------------------------------------

function SuperadminSupabase() {
  const auth = useAuth()
  const [data, setData] = useState<SuperadminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authTimedOut, setAuthTimedOut] = useState(false)

  useEffect(() => {
    if (!auth.loading) {
      setAuthTimedOut(false)
      return
    }
    const t = window.setTimeout(() => setAuthTimedOut(true), AUTH_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [auth.loading])

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(fetchSuperadminOverview(), OVERVIEW_LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((next) => {
        if (mounted) setData(next)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile])

  if (auth.loading && !authTimedOut) return <Skeleton />

  if (auth.loading && authTimedOut) {
    return (
      <BareState
        title="Session en attente"
        description="La session Supabase met trop longtemps à se résoudre. Rechargez la page ou reconnectez-vous."
        action={
          <Link to="/login">
            <Button>Retour à la connexion</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <Skeleton />

  if (!auth.profile) {
    return (
      <BareState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher la vue Superadmin."
        action={
          <Link to="/login">
            <Button>Retour à la connexion</Button>
          </Link>
        }
      />
    )
  }

  if (auth.role !== 'superadmin') {
    return (
      <AppLayout title="Accès refusé" subtitle="Vue Superadmin">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Accès réservé aux superadmins"
          description="Votre rôle actuel ne permet pas d'accéder à cette vue."
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Vue globale Superadmin" subtitle="Données Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger la vue Superadmin"
          description={error}
        />
      </AppLayout>
    )
  }

  if (!data) return null

  return (
    <AppLayout
      title="Vue globale Superadmin"
      subtitle="Pilotage multi-établissement · données Supabase temps réel"
    >
      <RoleGuard allow={['superadmin']}>
        <SuperadminSupabaseContent data={data} />
      </RoleGuard>
    </AppLayout>
  )
}

function SuperadminSupabaseContent({ data }: { data: SuperadminOverview }) {
  const { establishments, totals, network, alerts, visitsTotal, visitsLate, documentsMissing } = data

  if (establishments.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="w-5 h-5" />}
        title="Bienvenue sur PFMP Pilot AI"
        description="Aucun établissement n'est encore enregistré. Créez votre premier établissement pour commencer à piloter les PFMP."
        action={
          <Link to="/superadmin/establishments">
            <Button>Créer un établissement</Button>
          </Link>
        }
      />
    )
  }

  const lowActivityList = establishments.filter((e) => e.activityScore < LOW_ACTIVITY_THRESHOLD)
  const lowCompanyBaseList = establishments.filter((e) => e.companyCount < LOW_COMPANY_THRESHOLD)
  const accompanyCount = totals.lowActivityCount + totals.lowCompanyBaseCount

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Établissements"
          value={totals.establishmentsTotal}
          icon={<Building2 className="w-4 h-4" />}
          delta={{
            value: `${totals.establishmentsActive} actifs · ${totals.establishmentsInactive} inactifs`,
            tone: 'neutral',
          }}
        />
        <StatCard
          label="Élèves suivis"
          value={totals.studentsTotal}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Entreprises réseau"
          value={totals.companiesTotal}
          icon={<Briefcase className="w-4 h-4" />}
          delta={{ value: `${totals.strongPartnersTotal} partenaires forts`, tone: 'up' }}
        />
        <StatCard
          label="À accompagner"
          value={accompanyCount}
          icon={<TrendingDown className="w-4 h-4" />}
          delta={{ value: 'activité ou base entreprises faible', tone: 'down' }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>
                Établissements à accompagner
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Tri par score d'activité et taille de base entreprises
              </p>
            </div>
            <Link
              to="/superadmin/establishments"
              className="text-xs font-medium text-[var(--color-brand-700)] inline-flex items-center gap-1"
            >
              Tout voir <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody>
            {lowActivityList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Tous les établissements ont une activité satisfaisante.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {[...lowActivityList]
                  .sort((a, b) => a.activityScore - b.activityScore)
                  .slice(0, 5)
                  .map((e) => (
                    <EstablishmentRow key={e.establishment.id} item={e} />
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes globales</CardTitle>
          </CardHeader>
          <CardBody>
            {alerts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Aucune alerte active.</p>
            ) : (
              <SuperadminAlertList alerts={alerts} />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Network className="w-4 h-4" />}>
                Intelligence réseau entreprises
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Vue agrégée multi-établissement · {network.tutorsCount} tuteurs référencés
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Entreprises" value={network.totalCompanies} />
              <MiniStat
                label="Partenaires forts"
                value={network.totalStrongPartners}
                tone="success"
              />
              <MiniStat
                label="Complétude moyenne"
                value={`${network.averageCompletionRate}%`}
                tone={network.averageCompletionRate >= 60 ? 'success' : 'warning'}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Secteurs les plus représentés
              </p>
              {network.topSectors.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Aucune entreprise enregistrée.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {network.topSectors.map(({ sector, count }) => (
                    <Badge key={sector} tone="info">
                      {sector} · {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Familles de métiers
              </p>
              {network.topFamilies.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Aucune famille référencée.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {network.topFamilies.map(({ family, count }) => (
                    <Badge key={family} tone="brand">
                      {familyLabel(family)} · {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<TrendingDown className="w-4 h-4" />}>
              Bases entreprises faibles
            </CardTitle>
          </CardHeader>
          <CardBody>
            {lowCompanyBaseList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Aucun établissement sous le seuil.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowCompanyBaseList.map((e) => (
                  <li
                    key={e.establishment.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.establishment.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {e.companyCount} entreprises · {e.companyCompletionRate}%
                      </p>
                    </div>
                    <Badge tone="warning">{'<'} {LOW_COMPANY_THRESHOLD}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-6">
        <StatCard
          label="Visites enregistrées"
          value={visitsTotal}
          hint="toutes périodes confondues"
        />
        <StatCard
          label="Visites en retard"
          value={visitsLate}
          delta={{ value: 'à traiter', tone: 'down' }}
        />
        <StatCard
          label="Documents manquants"
          value={documentsMissing}
          delta={{ value: 'multi-établissement', tone: 'down' }}
        />
      </section>

      <section className="mt-6">
        <AiAssistantPanel
          type="superadmin"
          title="Assistant IA Superadmin"
          description="Analysez l'usage multi-établissement, détectez les bases entreprises faibles, préparez vos relances."
          examples={[
            'Quels établissements dois-je accompagner ?',
            'Quels établissements ont une base entreprises faible ?',
            'Quels secteurs sont les plus représentés ?',
            'Prépare une relance pour un établissement peu actif',
          ]}
          context={{
            establishmentsTotal: totals.establishmentsTotal,
            lowActivity: totals.lowActivityCount,
            lowCompanyBase: totals.lowCompanyBaseCount,
            avgCompletion: totals.averageCompletionRate,
          }}
        />
      </section>
    </>
  )
}

// --------------------------------------------------------------------------
// Mode démo (legacy, pour dev local sans Supabase)
// --------------------------------------------------------------------------

function SuperadminDemoContent() {
  const active = demoEstablishments.filter((e) => e.active).length
  const inactive = demoEstablishments.length - active
  const lowActivity = demoEstablishments.filter(
    (e) => e.activityScore < LOW_ACTIVITY_THRESHOLD,
  ).length
  const lowCompanyBase = demoEstablishments.filter(
    (e) => (e.companyCount ?? 0) < LOW_COMPANY_THRESHOLD,
  )
  const totalCompanies = demoEstablishments.reduce((s, e) => s + (e.companyCount ?? 0), 0)
  const totalStrongPartners = demoEstablishments.reduce(
    (s, e) => s + (e.strongPartnerCount ?? 0),
    0,
  )
  const avgCompletion =
    demoEstablishments.length === 0
      ? 0
      : Math.round(
          demoEstablishments.reduce((s, e) => s + (e.companyCompletionRate ?? 0), 0) /
            demoEstablishments.length,
        )

  const sectorMap = new Map<string, number>()
  const familyMap = new Map<ProfessionalFamily, number>()
  for (const c of demoCompanies) {
    sectorMap.set(c.sector, (sectorMap.get(c.sector) ?? 0) + 1)
    familyMap.set(c.professionalFamily, (familyMap.get(c.professionalFamily) ?? 0) + 1)
  }
  const topSectors = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topFamilies = [...familyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const visitsTotal = demoVisits.length
  const visitsLate = demoAlerts.filter((a) => a.type === 'visit_late').length
  const missingDocs = demoDocuments.filter((d) => d.status === 'missing').length

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Établissements"
          value={demoEstablishments.length}
          icon={<Building2 className="w-4 h-4" />}
          delta={{ value: `${active} actifs · ${inactive} inactif`, tone: 'neutral' }}
        />
        <StatCard
          label="Élèves suivis"
          value={demoEstablishments.reduce((s, e) => s + e.studentCount, 0)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Entreprises réseau"
          value={totalCompanies}
          icon={<Briefcase className="w-4 h-4" />}
          delta={{ value: `${totalStrongPartners} partenaires forts`, tone: 'up' }}
        />
        <StatCard
          label="À accompagner"
          value={lowActivity + lowCompanyBase.length}
          icon={<TrendingDown className="w-4 h-4" />}
          delta={{ value: 'activité ou base entreprises faible', tone: 'down' }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>
                Établissements à accompagner
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Tri par score d'activité et taille de base entreprises
              </p>
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
              {[...demoEstablishments]
                .sort((a, b) => a.activityScore - b.activityScore)
                .slice(0, 5)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {e.city} · {e.studentCount} élèves · {e.companyCount ?? 0}{' '}
                        entreprises · base à {e.companyCompletionRate ?? 0}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(e.companyCount ?? 0) < LOW_COMPANY_THRESHOLD && (
                        <Badge tone="warning">Base entreprises faible</Badge>
                      )}
                      <ScoreBadge score={e.activityScore} />
                    </div>
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
            <AlertList alerts={demoAlerts.slice(0, 6)} compact />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Network className="w-4 h-4" />}>
                Intelligence réseau entreprises
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Vue agrégée multi-établissement · {demoTutors.length} tuteurs référencés
              </p>
            </div>
            <Badge tone="brand">Mocké</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Entreprises" value={totalCompanies} />
              <MiniStat label="Partenaires forts" value={totalStrongPartners} tone="success" />
              <MiniStat
                label="Complétude moyenne"
                value={`${avgCompletion}%`}
                tone={avgCompletion >= 60 ? 'success' : 'warning'}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Secteurs les plus représentés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topSectors.map(([s, n]) => (
                  <Badge key={s} tone="info">
                    {s} · {n}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Familles de métiers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topFamilies.map(([f, n]) => (
                  <Badge key={f} tone="brand">
                    {PROFESSIONAL_FAMILY_LABELS[f]} · {n}
                  </Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<TrendingDown className="w-4 h-4" />}>
              Bases entreprises faibles
            </CardTitle>
          </CardHeader>
          <CardBody>
            {lowCompanyBase.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Aucun établissement sous le seuil.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowCompanyBase.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {e.companyCount ?? 0} entreprises · {e.companyCompletionRate ?? 0}%
                      </p>
                    </div>
                    <Badge tone="warning">{'<'} {LOW_COMPANY_THRESHOLD}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-6">
        <StatCard
          label="Visites enregistrées"
          value={visitsTotal}
          hint="toutes périodes confondues"
        />
        <StatCard
          label="Visites en retard"
          value={visitsLate}
          delta={{ value: 'à traiter', tone: 'down' }}
        />
        <StatCard
          label="Documents manquants"
          value={missingDocs}
          delta={{ value: 'multi-établissement', tone: 'down' }}
        />
      </section>

      <section className="mt-6">
        <AiAssistantPanel
          type="superadmin"
          title="Assistant IA Superadmin"
          description="Analysez l'usage multi-établissement, détectez les bases entreprises faibles, préparez vos relances."
          examples={[
            'Quels établissements dois-je accompagner ?',
            'Quels établissements ont une base entreprises faible ?',
            'Quels secteurs sont les plus représentés ?',
            'Prépare une relance pour un établissement peu actif',
          ]}
          context={{
            establishmentsTotal: demoEstablishments.length,
            lowActivity,
            lowCompanyBase: lowCompanyBase.length,
            avgCompletion,
          }}
        />
      </section>
    </>
  )
}

// --------------------------------------------------------------------------
// Composants utilitaires
// --------------------------------------------------------------------------

function EstablishmentRow({ item }: { item: EstablishmentWithMetrics }) {
  const e = item.establishment
  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{e.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {e.city ?? '—'} · {item.studentCount} élèves · {item.companyCount} entreprises · base à{' '}
          {item.companyCompletionRate}%
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {item.companyCount < LOW_COMPANY_THRESHOLD && (
          <Badge tone="warning">Base entreprises faible</Badge>
        )}
        <ScoreBadge score={item.activityScore} />
      </div>
    </li>
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

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'success' | 'warning' | 'neutral'
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success-fg)]'
      : tone === 'warning'
        ? 'text-[var(--color-warning-fg)]'
        : 'text-[var(--color-text)]'
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tracking-tight ${cls}`}>{value}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <BareState
      title="Chargement de la vue Superadmin"
      description="Lecture des données Supabase..."
    />
  )
}

function BareState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <AppLayout title="Vue globale Superadmin" subtitle="Données Supabase">
      <EmptyState title={title} description={description} action={action} />
    </AppLayout>
  )
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ])
}

function SuperadminAlertList({ alerts }: { alerts: AlertRow[] }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {alerts.map((alert) => (
        <li key={alert.id} className="py-3">
          <div className="flex items-start gap-3">
            <Badge tone={alert.severity === 'urgent' ? 'danger' : 'warning'}>
              {alert.severity}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text)]">{alert.message}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {alert.type} · {new Date(alert.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function familyLabel(family: string): string {
  const key = family as ProfessionalFamily
  return PROFESSIONAL_FAMILY_LABELS[key] ?? family
}
