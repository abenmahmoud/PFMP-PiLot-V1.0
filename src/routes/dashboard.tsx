import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  FileWarning,
  Calendar,
  Network,
  Building2,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { StatCard } from '@/components/StatCard'
import { AlertList } from '@/components/AlertList'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
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

function DashboardPage() {
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

  // Réseau entreprises pour cet établissement
  const intelligence = buildCompanyIntelligence(ESTABLISHMENT_ID)
  const localCompanies = companies.filter((c) => c.establishmentId === ESTABLISHMENT_ID)

  // Entreprises actives pour la période en cours
  const periodCompanyIds = new Set(
    periodStudents.map((s) => s.companyId).filter(Boolean) as string[],
  )
  const activePeriodCompanies = localCompanies.filter((c) => periodCompanyIds.has(c.id))

  // Familles couvertes pendant la période
  const familiesCovered = new Set<ProfessionalFamily>()
  for (const c of activePeriodCompanies) familiesCovered.add(c.professionalFamily)

  // Détection de familles sous-représentées (≤ 1 entreprise dans le réseau)
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

  // Documents critiques manquants = conventions et attestations
  const criticalMissing = missingConventions + missingAttestations

  return (
    <AppLayout
      title="Dashboard établissement"
      subtitle="Lycée Professionnel Jean Moulin · PFMP 2 — Printemps 2026"
    >
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
