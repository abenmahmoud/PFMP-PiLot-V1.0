import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Building2,
  Users,
  AlertTriangle,
  TrendingDown,
  ArrowUpRight,
  Network,
  Briefcase,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { StatCard } from '@/components/StatCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertList } from '@/components/AlertList'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Badge } from '@/components/ui/Badge'
import {
  alerts,
  companies,
  establishments,
  tutors,
  visits,
  documents,
} from '@/data/demo'
import { PROFESSIONAL_FAMILY_LABELS, type ProfessionalFamily } from '@/types'

export const Route = createFileRoute('/superadmin/')({ component: SuperadminPage })

const LOW_COMPANY_THRESHOLD = 8 // seuil "base entreprise faible"
const LOW_ACTIVITY_THRESHOLD = 40 // seuil score d'activité

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
  const lowActivity = establishments.filter(
    (e) => e.activityScore < LOW_ACTIVITY_THRESHOLD,
  ).length
  const lowCompanyBase = establishments.filter(
    (e) => (e.companyCount ?? 0) < LOW_COMPANY_THRESHOLD,
  )
  const totalCompanies = establishments.reduce((s, e) => s + (e.companyCount ?? 0), 0)
  const totalStrongPartners = establishments.reduce(
    (s, e) => s + (e.strongPartnerCount ?? 0),
    0,
  )
  const avgCompletion =
    establishments.length === 0
      ? 0
      : Math.round(
          establishments.reduce((s, e) => s + (e.companyCompletionRate ?? 0), 0) /
            establishments.length,
        )

  // Agrégat secteurs / familles sur les entreprises connues (mock = E1 seulement)
  const sectorMap = new Map<string, number>()
  const familyMap = new Map<ProfessionalFamily, number>()
  for (const c of companies) {
    sectorMap.set(c.sector, (sectorMap.get(c.sector) ?? 0) + 1)
    familyMap.set(c.professionalFamily, (familyMap.get(c.professionalFamily) ?? 0) + 1)
  }
  const topSectors = [...sectorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topFamilies = [...familyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const visitsTotal = visits.length
  const visitsLate = alerts.filter((a) => a.type === 'visit_late').length
  const missingDocs = documents.filter((d) => d.status === 'missing').length

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
          label="Entreprises réseau"
          value={totalCompanies}
          icon={<Briefcase className="w-4 h-4" />}
          delta={{
            value: `${totalStrongPartners} partenaires forts`,
            tone: 'up',
          }}
        />
        <StatCard
          label="Établissements à accompagner"
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
              {[...establishments]
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
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>
              Alertes globales
            </CardTitle>
          </CardHeader>
          <CardBody>
            <AlertList alerts={alerts.slice(0, 6)} compact />
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
                Vue agrégée multi-établissement · {tutors.length} tuteurs référencés
              </p>
            </div>
            <Badge tone="brand">Mocké</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <p className="text-xs text-[var(--color-text-muted)]">
              TODO — agréger ces stats côté Postgres avec une vue matérialisée par
              tenant et un rafraîchissement quotidien.
            </p>
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
        <StatCard label="Visites enregistrées" value={visitsTotal} hint="toutes périodes confondues" />
        <StatCard label="Visites en retard" value={visitsLate} delta={{ value: 'à traiter', tone: 'down' }} />
        <StatCard label="Documents manquants" value={missingDocs} delta={{ value: 'multi-établissement', tone: 'down' }} />
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
            establishmentsTotal: establishments.length,
            lowActivity,
            lowCompanyBase: lowCompanyBase.length,
            avgCompletion,
          }}
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

// TODO — agréger ces stats côté Postgres (vue matérialisée par tenant) lorsque
// Supabase sera branché.
