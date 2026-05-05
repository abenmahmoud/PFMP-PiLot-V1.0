import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  FileWarning,
  Calendar,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { StatCard } from '@/components/StatCard'
import { AlertList } from '@/components/AlertList'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import {
  alerts,
  activityLog,
  classes,
  documents,
  pfmpPeriods,
  students,
  teachers,
  visits,
  ESTABLISHMENT_ID,
} from '@/data/demo'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  const period = pfmpPeriods.find((p) => p.status === 'in_progress')!
  const periodStudents = students.filter((s) => s.periodId === period.id)
  const inStage = periodStudents.filter(
    (s) => s.stageStatus === 'in_progress' || s.stageStatus === 'signed_convention',
  ).length
  const noStage = periodStudents.filter((s) => s.stageStatus === 'no_stage').length
  const visitsDone = visits.filter((v) => v.periodId === period.id && v.status === 'validated').length
  const visitsLate = alerts.filter((a) => a.type === 'visit_late').length
  const missingConventions = documents.filter((d) => d.type === 'convention' && d.status === 'missing').length
  const missingAttestations = documents.filter((d) => d.type === 'attestation' && d.status === 'missing').length

  const myAlerts = alerts.filter((a) => a.establishmentId === ESTABLISHMENT_ID && !a.resolved)
  const myActivity = activityLog.filter((a) => a.establishmentId === ESTABLISHMENT_ID).slice(0, 6)

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
          label="Élèves sans stage"
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
          label="Documents manquants"
          value={missingConventions + missingAttestations}
          icon={<FileWarning className="w-4 h-4" />}
          delta={{ value: `${missingConventions} convention · ${missingAttestations} attestation`, tone: 'neutral' }}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle icon={<Users className="w-4 h-4" />}>Charge des professeurs référents</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Seuil configuré à 6 élèves par référent
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {teachers.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[10px] font-semibold">
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </span>
                    <span className="font-medium truncate">
                      {t.firstName} {t.lastName}
                    </span>
                  </div>
                  <TeacherLoadIndicator load={t.studentLoad} threshold={6} />
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
              value={Math.round(((periodStudents.length - period.missingDocuments) / periodStudents.length) * 100)}
            />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes</CardTitle>
          </CardHeader>
          <CardBody>
            <AlertList alerts={myAlerts.slice(0, 5)} compact />
          </CardBody>
        </Card>

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
            'Prépare un résumé pour le proviseur',
          ]}
          context={{
            periodId: period.id,
            studentsTotal: periodStudents.length,
            noStage,
            missingDocuments: period.missingDocuments,
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
