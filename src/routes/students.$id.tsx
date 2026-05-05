import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  ClipboardCheck,
  Plus,
  ArrowLeft,
  CalendarRange,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StageStatusBadge } from '@/components/StatusBadge'
import { DocumentList } from '@/components/DocumentList'
import { AlertList } from '@/components/AlertList'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { EmptyState } from '@/components/EmptyState'
import {
  alerts,
  classes,
  companies,
  documents,
  pfmpPeriods,
  students,
  teachers,
  tutors,
  visits,
  activityLog,
} from '@/data/demo'

export const Route = createFileRoute('/students/$id')({ component: StudentDetailPage })

function StudentDetailPage() {
  const { id } = useParams({ from: '/students/$id' })
  const student = students.find((s) => s.id === id)

  if (!student) {
    return (
      <AppLayout title="Élève introuvable">
        <EmptyState
          title="Élève introuvable"
          description="Cet identifiant ne correspond à aucun élève dans la démo."
          action={
            <Link to="/students">
              <Button variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
                Retour à la liste
              </Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  const klass = classes.find((c) => c.id === student.classId)
  const period = pfmpPeriods.find((p) => p.id === student.periodId)
  const company = companies.find((c) => c.id === student.companyId)
  const tutor = tutors.find((t) => t.id === student.tutorId)
  const ref = teachers.find((t) => t.id === student.referentId)
  const docs = documents.filter((d) => d.studentId === student.id)
  const visited = visits.filter((v) => v.studentId === student.id)
  const myAlerts = alerts.filter((a) => a.relatedEntity.id === student.id)
  const myActivity = activityLog.slice(0, 4)

  return (
    <AppLayout
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`${klass?.name || ''} · ${student.formation}`}
      actions={
        <div className="flex items-center gap-2">
          <Link to="/visits/new">
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>
              Nouvelle visite
            </Button>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fiche stage</CardTitle>
            <StageStatusBadge status={student.stageStatus} />
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Classe" value={klass?.name || '—'} />
            <Field label="Formation" value={student.formation} />
            <Field label="Email" value={student.email || '—'} icon={<Mail className="w-3.5 h-3.5" />} />
            <Field label="Téléphone" value={student.phone || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
            <Field label="Référent" value={ref ? `${ref.firstName} ${ref.lastName}` : '—'} />
            <Field label="Période" value={period?.name || '—'} icon={<CalendarRange className="w-3.5 h-3.5" />} />

            <div className="md:col-span-2 border-t border-[var(--color-border)] pt-4 mt-1">
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Entreprise d'accueil
              </p>
              {company ? (
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--color-text-subtle)]" />
                    {company.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <a
                      className="hover:text-[var(--color-brand-700)] underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps?q=${encodeURIComponent(
                        `${company.address}, ${company.zipCode} ${company.city}`,
                      )}`}
                    >
                      {company.address}, {company.zipCode} {company.city}
                    </a>
                  </p>
                  {tutor && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Tuteur : {tutor.firstName} {tutor.lastName} · {tutor.function}
                      {tutor.phone && ` · ${tutor.phone}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune entreprise affectée.</p>
              )}
            </div>

            {student.notes && (
              <div className="md:col-span-2 rounded-lg bg-[var(--color-warning-bg)] border border-amber-200 px-4 py-3 text-sm text-[var(--color-warning-fg)]">
                <strong>Note interne :</strong> {student.notes}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
          </CardHeader>
          <CardBody>
            <AlertList alerts={myAlerts} compact emptyMessage="Aucune alerte sur cet élève." />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Visites</CardTitle>
            <Link to="/visits/new" className="text-xs font-medium text-[var(--color-brand-700)]">
              Nouvelle visite
            </Link>
          </CardHeader>
          <CardBody>
            {visited.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                Aucune visite enregistrée.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {visited.map((v) => (
                  <li key={v.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {new Date(v.date).toLocaleDateString('fr-FR')}
                      </p>
                      <Link
                        to="/visits/$id"
                        params={{ id: v.id }}
                        className="text-xs font-medium text-[var(--color-brand-700)]"
                      >
                        Ouvrir
                      </Link>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                      {v.conditions || v.activities || v.tutorRemark || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardBody>
            <DocumentList documents={docs} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardBody>
            <ActivityTimeline entries={myActivity} />
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function Field({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
        {label}
      </p>
      <p className="text-sm text-[var(--color-text)] flex items-center gap-2">
        {icon}
        {value}
      </p>
    </div>
  )
}
