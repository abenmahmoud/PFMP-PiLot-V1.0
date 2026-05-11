import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  Building2,
  Calendar,
  ClipboardCheck,
  FileWarning,
  GraduationCap,
  Network,
  Plus,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { StatCard } from '@/components/StatCard'
import { AlertList } from '@/components/AlertList'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { EmptyState } from '@/components/EmptyState'
import { SetupChecklist, type SetupChecklistStep } from '@/components/SetupChecklist'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchDashboardData,
  type DashboardData,
} from '@/services/dashboard'
import type { AlertRow, AuditLogRow } from '@/lib/database.types'
import {
  alerts,
  activityLog,
  classes,
  companies,
  documents,
  pfmpPeriods,
  students,
  teachers,
  visits,
  buildCompanyIntelligence,
  ESTABLISHMENT_ID,
} from '@/data/demo'
import { PROFESSIONAL_FAMILY_LABELS, type ProfessionalFamily } from '@/types'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

const TEACHER_OVERLOAD_THRESHOLD = 6
const DASHBOARD_LOAD_TIMEOUT_MS = 12000
const AUTH_LOAD_TIMEOUT_MS = 8000

function DashboardPage() {
  if (isDemoMode()) return <DashboardDemo />
  return <DashboardSupabase />
}

function DashboardSupabase() {
  const auth = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authTimedOut, setAuthTimedOut] = useState(false)

  useEffect(() => {
    if (!auth.loading) {
      setAuthTimedOut(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setAuthTimedOut(true)
    }, AUTH_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
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

    withTimeout(fetchDashboardData(), DASHBOARD_LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextData) => {
        if (mounted) setData(nextData)
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

  if (auth.loading && !authTimedOut) return <DashboardSkeleton />

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

  if (loading) return <DashboardSkeleton />

  if (!auth.profile) {
    return (
      <BareState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher le dashboard réel."
        action={
          <Link to="/login">
            <Button>Retour à la connexion</Button>
          </Link>
        }
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Dashboard établissement" subtitle="Données Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger le dashboard"
          description={error}
        />
      </AppLayout>
    )
  }

  if (!data) return null

  const period = data.currentPeriod
  const subtitle = period
    ? `Données Supabase · ${period.name} · ${period.school_year}`
    : 'Données Supabase · aucune période PFMP active'

  return (
    <AppLayout title="Dashboard établissement" subtitle={subtitle}>
      <div className="space-y-6">
        <SetupChecklist steps={buildSetupSteps(data.setupChecklist)} />
        {!period ? (
          <EmptyState
            icon={<Calendar className="w-5 h-5" />}
            title="Aucune période PFMP en cours"
            description="Créez ou activez une période PFMP pour commencer à suivre les affectations, visites et documents réels de l'établissement."
            action={
              <Link to="/pfmp-periods">
                <Button iconLeft={<Plus className="w-4 h-4" />}>Créer une période PFMP</Button>
              </Link>
            }
          />
        ) : (
          <DashboardSupabaseContent data={data} />
        )}
      </div>
    </AppLayout>
  )
}

function DashboardSupabaseContent({ data }: { data: DashboardData }) {
  const { kpis, teacherLoads, companyNetwork, alerts: prodAlerts, activity } = data

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Élèves en PFMP"
          value={kpis.studentsInStage}
          icon={<GraduationCap className="w-4 h-4" />}
          delta={{ value: `/${kpis.studentsTotal} visibles`, tone: 'neutral' }}
        />
        <StatCard
          label="Élèves sans entreprise"
          value={kpis.studentsNoStage}
          icon={<AlertTriangle className="w-4 h-4" />}
          delta={{ value: `${kpis.assignmentRate}% affectés`, tone: 'neutral' }}
        />
        <StatCard
          label="Visites réalisées"
          value={kpis.visitsDone}
          icon={<ClipboardCheck className="w-4 h-4" />}
          delta={{ value: `${kpis.visitRate}% prévu`, tone: 'neutral' }}
        />
        <StatCard
          label="Documents critiques"
          value={kpis.criticalMissing}
          icon={<FileWarning className="w-4 h-4" />}
          delta={{
            value: `${kpis.conventionsMissing} convention · ${kpis.attestationsMissing} attestation`,
            tone: kpis.criticalMissing === 0 ? 'neutral' : 'down',
          }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Users className="w-4 h-4" />}>
                Charge des professeurs référents
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Seuil configuré à {TEACHER_OVERLOAD_THRESHOLD} élèves par référent
                {teacherLoads.some((teacher) => teacher.overloaded) &&
                  ` · ${teacherLoads.filter((teacher) => teacher.overloaded).length} surchargé(s)`}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {teacherLoads.length === 0 ? (
              <InlineEmpty message="Aucun professeur renseigné dans Supabase." />
            ) : (
              <ul className="space-y-3">
                {teacherLoads.map((teacher) => (
                  <li
                    key={teacher.teacherId}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[10px] font-semibold">
                        {teacher.firstName[0]}
                        {teacher.lastName[0]}
                      </span>
                      <span className="font-medium truncate">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                    </div>
                    <TeacherLoadIndicator
                      load={teacher.load}
                      threshold={TEACHER_OVERLOAD_THRESHOLD}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<Calendar className="w-4 h-4" />}>Période en cours</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                {data.currentPeriod?.name}
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <ProgressRow label="Affectation" value={kpis.assignmentRate} />
            <ProgressRow label="Visites réalisées" value={kpis.visitRate} />
            <ProgressRow label="Documents en règle" value={kpis.documentsReadyRate} />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Network className="w-4 h-4" />}>
                Réseau entreprises PFMP
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Données Supabase · {companyNetwork.totalCompanies} entreprises visibles
              </p>
            </div>
            <Badge tone="success">Réel</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat
                label="Actives sur la période"
                value={companyNetwork.activeOnPeriod}
                icon={<Building2 className="w-3.5 h-3.5" />}
              />
              <MiniStat label="Partenaires forts" value={companyNetwork.strongPartners} tone="success" />
              <MiniStat label="À relancer" value={companyNetwork.toRecontact} tone="warning" />
              <MiniStat
                label="Familles couvertes"
                value={`${companyNetwork.familiesCovered}/${companyNetwork.familiesTotal}`}
              />
            </div>

            {companyNetwork.totalCompanies === 0 ? (
              <InlineEmpty message="Aucune entreprise réelle n'est encore renseignée." />
            ) : (
              <>
                {companyNetwork.toRecontactCompanies.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1.5">
                      À relancer cette semaine
                    </p>
                    <ul className="space-y-1">
                      {companyNetwork.toRecontactCompanies.map((company) => (
                        <li
                          key={company.id}
                          className="text-sm flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{company.name}</span>
                          <span className="text-xs text-[var(--color-text-muted)] truncate">
                            {company.city ?? 'Ville non renseignée'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {companyNetwork.underrepresentedFamilies.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1.5">
                      Familles sous-représentées
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {companyNetwork.underrepresentedFamilies.map((family) => (
                        <Badge key={family} tone="warning">
                          {family}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes</CardTitle>
          </CardHeader>
          <CardBody>
            <DashboardAlertList alerts={prodAlerts} />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Élèves et placements</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <ProgressRow label="Affectés" value={kpis.assignmentRate} />
            <ProgressRow label="Documents en règle" value={kpis.documentsReadyRate} />
            <p className="text-xs text-[var(--color-text-muted)]">
              Vue agrégée réelle. Le détail par classe arrive avec P0.4/P1.2.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top secteurs (réseau)</CardTitle>
          </CardHeader>
          <CardBody>
            {companyNetwork.topSectors.length === 0 ? (
              <InlineEmpty message="Aucun secteur renseigné." />
            ) : (
              <ul className="space-y-2">
                {companyNetwork.topSectors.map((sector) => (
                  <li
                    key={sector.sector}
                    className="text-sm flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{sector.sector}</span>
                    <Badge tone="info">{sector.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardBody>
            <DashboardActivityList entries={activity} />
          </CardBody>
        </Card>
      </section>

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        Visites en retard signalées : {kpis.visitsLate}
      </p>
    </>
  )
}

function DashboardDemo() {
  const period = pfmpPeriods.find((p) => p.status === 'in_progress')!
  const periodStudents = students.filter((s) => s.periodId === period.id)
  const inStage = periodStudents.filter(
    (s) => s.stageStatus === 'in_progress' || s.stageStatus === 'signed_convention',
  ).length
  const noStage = periodStudents.filter((s) => s.stageStatus === 'no_stage').length
  const visitsDone = visits.filter(
    (v) => v.periodId === period.id && v.status === 'validated',
  ).length
  const visitsLate = alerts.filter((a) => a.type === 'visit_late').length
  const missingConventions = documents.filter(
    (d) => d.type === 'convention' && d.status === 'missing',
  ).length
  const missingAttestations = documents.filter(
    (d) => d.type === 'attestation' && d.status === 'missing',
  ).length

  const myAlerts = alerts.filter(
    (a) => a.establishmentId === ESTABLISHMENT_ID && !a.resolved,
  )
  const myActivity = activityLog
    .filter((a) => a.establishmentId === ESTABLISHMENT_ID)
    .slice(0, 6)

  const intelligence = buildCompanyIntelligence(ESTABLISHMENT_ID)
  const localCompanies = companies.filter((c) => c.establishmentId === ESTABLISHMENT_ID)

  const periodCompanyIds = new Set(
    periodStudents.map((s) => s.companyId).filter(Boolean) as string[],
  )
  const activePeriodCompanies = localCompanies.filter((c) => periodCompanyIds.has(c.id))

  const familiesCovered = new Set<ProfessionalFamily>()
  for (const c of activePeriodCompanies) familiesCovered.add(c.professionalFamily)

  const familyCount = new Map<ProfessionalFamily, number>()
  for (const c of localCompanies) {
    familyCount.set(c.professionalFamily, (familyCount.get(c.professionalFamily) ?? 0) + 1)
  }
  const underrepresented = [...familyCount.entries()]
    .filter(([, n]) => n <= 1)
    .map(([f]) => f)

  const toRecontactCompanies = localCompanies.filter(
    (c) => c.status === 'to_recontact' || c.status === 'to_watch',
  )

  const overloadedTeachers = teachers.filter(
    (t) => t.studentLoad > TEACHER_OVERLOAD_THRESHOLD,
  )

  const criticalMissing = missingConventions + missingAttestations

  return (
    <AppLayout
      title="Dashboard établissement"
      subtitle="Lycée Professionnel Jean Moulin · PFMP 2 — Printemps 2026"
    >
      <SetupChecklist steps={buildDemoSetupSteps()} />
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Élèves en PFMP"
          value={inStage}
          icon={<GraduationCap className="w-4 h-4" />}
          delta={{ value: `/${periodStudents.length} période`, tone: 'neutral' }}
        />
        <StatCard
          label="Élèves sans entreprise"
          value={noStage}
          icon={<AlertTriangle className="w-4 h-4" />}
          delta={{ value: 'à 8 jours du début', tone: 'down' }}
        />
        <StatCard
          label="Visites réalisées"
          value={visitsDone}
          icon={<ClipboardCheck className="w-4 h-4" />}
          delta={{ value: `${period.visitRate}% prévu`, tone: 'neutral' }}
        />
        <StatCard
          label="Documents critiques"
          value={criticalMissing}
          icon={<FileWarning className="w-4 h-4" />}
          delta={{
            value: `${missingConventions} convention · ${missingAttestations} attestation`,
            tone: criticalMissing === 0 ? 'neutral' : 'down',
          }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Users className="w-4 h-4" />}>
                Charge des professeurs référents
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Seuil configuré à {TEACHER_OVERLOAD_THRESHOLD} élèves par référent
                {overloadedTeachers.length > 0 &&
                  ` · ${overloadedTeachers.length} surchargé(s)`}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[10px] font-semibold">
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </span>
                    <span className="font-medium truncate">
                      {t.firstName} {t.lastName}
                    </span>
                  </div>
                  <TeacherLoadIndicator
                    load={t.studentLoad}
                    threshold={TEACHER_OVERLOAD_THRESHOLD}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<Calendar className="w-4 h-4" />}>Période en cours</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">{period.name}</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <ProgressRow label="Affectation" value={period.assignmentRate} />
            <ProgressRow label="Visites réalisées" value={period.visitRate} />
            <ProgressRow
              label="Documents en règle"
              value={Math.round(
                ((periodStudents.length - period.missingDocuments) /
                  periodStudents.length) *
                  100,
              )}
            />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Network className="w-4 h-4" />}>
                Réseau entreprises PFMP
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Vue agrégée pour la période en cours · {intelligence.totalCompanies}{' '}
                entreprises au total · base à {intelligence.averageCompletionRate}%
              </p>
            </div>
            <Badge tone="brand">Mocké</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat
                label="Actives sur la période"
                value={activePeriodCompanies.length}
                icon={<Building2 className="w-3.5 h-3.5" />}
              />
              <MiniStat
                label="Partenaires forts"
                value={intelligence.strongPartners}
                tone="success"
              />
              <MiniStat
                label="À relancer"
                value={toRecontactCompanies.length}
                tone="warning"
              />
              <MiniStat
                label="Familles couvertes"
                value={`${familiesCovered.size}/${familyCount.size}`}
              />
            </div>

            {toRecontactCompanies.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1.5">
                  À relancer cette semaine
                </p>
                <ul className="space-y-1">
                  {toRecontactCompanies.slice(0, 3).map((c) => (
                    <li
                      key={c.id}
                      className="text-sm flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate">
                        {c.city}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {underrepresented.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1.5">
                  Familles sous-représentées
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {underrepresented.map((f) => (
                    <Badge key={f} tone="warning">
                      {PROFESSIONAL_FAMILY_LABELS[f]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes</CardTitle>
          </CardHeader>
          <CardBody>
            <AlertList alerts={myAlerts.slice(0, 6)} compact />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Progression par classe</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {classes.map((c) => {
              const inClass = students.filter((s) => s.classId === c.id)
              const ok = inClass.filter(
                (s) => s.stageStatus !== 'no_stage' && s.stageStatus !== 'interrupted',
              ).length
              const pct = Math.round((ok / inClass.length) * 100)
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {ok}/{inClass.length}
                    </span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-[var(--color-muted)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-brand-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top secteurs (réseau)</CardTitle>
          </CardHeader>
          <CardBody>
            {intelligence.topSectors.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Aucune entreprise renseignée.
              </p>
            ) : (
              <ul className="space-y-2">
                {intelligence.topSectors.map((s) => (
                  <li
                    key={s.sector}
                    className="text-sm flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{s.sector}</span>
                    <Badge tone="info">{s.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardBody>
            <ActivityTimeline entries={myActivity} />
          </CardBody>
        </Card>
      </section>

      <section className="mt-6">
        <AiAssistantPanel
          type="establishment"
          title="Assistant IA établissement"
          description="Préparez un point pour la direction, repérez les retards, détectez les actions à mener."
          examples={[
            'Fais-moi le point sur cette période PFMP',
            'Quelles classes sont en retard ?',
            'Quels documents manquent ?',
            'Quelles entreprises faut-il relancer ?',
            'Prépare un résumé pour le proviseur',
          ]}
          context={{
            periodId: period.id,
            studentsTotal: periodStudents.length,
            noStage,
            missingDocuments: period.missingDocuments,
            companiesActive: activePeriodCompanies.length,
            companiesToRecontact: toRecontactCompanies.length,
          }}
        />
      </section>

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        Visites en retard signalées : {visitsLate}
      </p>
    </AppLayout>
  )
}

function buildSetupSteps(setup: DashboardData['setupChecklist']): SetupChecklistStep[] {
  return [
    { id: 'account', label: 'Compte active', done: true },
    {
      id: 'identity',
      label: 'Identite etablissement completee',
      done: setup.identityComplete,
      cta: { label: 'Configurer', to: '/settings' },
    },
    {
      id: 'class',
      label: 'Premiere classe creee',
      done: setup.classesCount > 0,
      cta: { label: 'Creer une classe', to: '/classes' },
    },
    {
      id: 'student',
      label: 'Premier eleve importe',
      done: setup.studentsCount > 0,
      cta: { label: 'Ajouter des eleves', to: '/students' },
    },
    {
      id: 'period',
      label: 'Premiere periode PFMP definie',
      done: setup.periodsCount > 0,
      cta: { label: 'Creer une periode', to: '/pfmp-periods' },
    },
  ]
}

function buildDemoSetupSteps(): SetupChecklistStep[] {
  return [
    { id: 'account', label: 'Compte active', done: true },
    { id: 'identity', label: 'Identite etablissement completee', done: true },
    { id: 'class', label: 'Premiere classe creee', done: true },
    { id: 'student', label: 'Premier eleve importe', done: true },
    { id: 'period', label: 'Premiere periode PFMP definie', done: true },
  ]
}

function DashboardSkeleton() {
  return (
    <BareState title="Chargement du dashboard" description="Lecture des données Supabase..." />
  )
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
  }
}

function BareState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-3 rounded-full bg-[var(--color-muted)] animate-pulse"
            />
          ))}
        </div>
        <h1 className="text-base font-semibold text-[var(--color-text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

function DashboardAlertList({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) return <InlineEmpty message="Aucune alerte active." />

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

function DashboardActivityList({ entries }: { entries: AuditLogRow[] }) {
  if (entries.length === 0) return <InlineEmpty message="Aucune activité récente." />

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--color-text)]">
              {entry.description || entry.action}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {new Date(entry.created_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function InlineEmpty({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">{message}</p>
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-[var(--color-text-muted)]">{value}%</span>
      </div>
      <div className="h-1.5 mt-1 rounded-full bg-[var(--color-muted)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string | number
  tone?: 'success' | 'warning' | 'neutral'
  icon?: React.ReactNode
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success-fg)]'
      : tone === 'warning'
        ? 'text-[var(--color-warning-fg)]'
        : 'text-[var(--color-text)]'
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tracking-tight ${cls}`}>{value}</p>
    </div>
  )
}
