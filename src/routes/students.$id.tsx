import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StageStatusBadge, DocumentStatusBadge } from '@/components/StatusBadge'
import { DocumentList } from '@/components/DocumentList'
import { AlertList } from '@/components/AlertList'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchStudentById,
  type StudentDetail,
} from '@/services/students'
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
  if (isDemoMode()) return <StudentDetailDemo />
  return <StudentDetailSupabase />
}

function StudentDetailSupabase() {
  const { id } = useParams({ from: '/students/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    fetchStudentById(id)
      .then((nextDetail) => {
        if (mounted) setDetail(nextDetail)
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
  }, [auth.loading, auth.profile, id])

  if (auth.loading || loading) {
    return <BareDetailState title="Chargement de la fiche eleve" description="Lecture des donnees Supabase..." />
  }

  if (!auth.profile) {
    return (
      <BareDetailState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher cette fiche eleve."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Fiche eleve" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger la fiche"
          description={error}
          action={<BackToStudents />}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Eleve introuvable" subtitle="Donnees Supabase">
        <EmptyState
          title="Eleve introuvable ou inaccessible"
          description="Cet identifiant ne correspond a aucun eleve visible dans votre tenant."
          action={<BackToStudents />}
        />
      </AppLayout>
    )
  }

  const student = detail.student
  const formation = student.formation ?? detail.class?.formation ?? '-'

  return (
    <AppLayout
      title={`${student.first_name} ${student.last_name}`}
      subtitle={`${detail.class?.name ?? 'Classe non renseignee'} - ${formation}`}
      actions={
        <div className="flex items-center gap-2">
          <Link to="/visits/new">
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} disabled>
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
            <StageStatusBadge status={detail.placement?.status ?? 'no_stage'} />
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Classe" value={detail.class?.name ?? '-'} />
            <Field label="Formation" value={formation} />
            <Field label="Email" value={student.email ?? '-'} icon={<Mail className="w-3.5 h-3.5" />} />
            <Field label="Telephone" value={student.phone ?? '-'} icon={<Phone className="w-3.5 h-3.5" />} />
            <Field
              label="Referent"
              value={detail.referent ? `${detail.referent.first_name} ${detail.referent.last_name}` : '-'}
            />
            <Field
              label="Dates stage"
              value={
                detail.placement?.start_date && detail.placement?.end_date
                  ? `${formatDate(detail.placement.start_date)} - ${formatDate(detail.placement.end_date)}`
                  : '-'
              }
              icon={<CalendarRange className="w-3.5 h-3.5" />}
            />

            <div className="md:col-span-2 border-t border-[var(--color-border)] pt-4 mt-1">
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                Entreprise d'accueil
              </p>
              {detail.company ? (
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--color-text-subtle)]" />
                    {detail.company.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {detail.company.address || detail.company.city
                      ? `${detail.company.address ?? ''} ${detail.company.zip_code ?? ''} ${detail.company.city ?? ''}`.trim()
                      : 'Adresse non renseignee'}
                  </p>
                  {detail.tutor && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Tuteur : {detail.tutor.first_name} {detail.tutor.last_name}
                      {detail.tutor.function && ` - ${detail.tutor.function}`}
                      {detail.tutor.phone && ` - ${detail.tutor.phone}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune entreprise affectee.</p>
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
            <StudentAlerts alerts={detail.alerts} />
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
            <StudentVisits visits={detail.visits} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<FileText className="w-4 h-4" />}>Documents</CardTitle>
          </CardHeader>
          <CardBody>
            <StudentDocuments documents={detail.documents} />
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function StudentDetailDemo() {
  const { id } = useParams({ from: '/students/$id' })
  const student = students.find((s) => s.id === id)

  if (!student) {
    return (
      <AppLayout title="Eleve introuvable">
        <EmptyState
          title="Eleve introuvable"
          description="Cet identifiant ne correspond a aucun eleve dans la demo."
          action={<BackToStudents />}
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
      subtitle={`${klass?.name || ''} - ${student.formation}`}
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
            <Field label="Classe" value={klass?.name || '-'} />
            <Field label="Formation" value={student.formation} />
            <Field label="Email" value={student.email || '-'} icon={<Mail className="w-3.5 h-3.5" />} />
            <Field label="Telephone" value={student.phone || '-'} icon={<Phone className="w-3.5 h-3.5" />} />
            <Field label="Referent" value={ref ? `${ref.firstName} ${ref.lastName}` : '-'} />
            <Field label="Periode" value={period?.name || '-'} icon={<CalendarRange className="w-3.5 h-3.5" />} />

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
                    {company.address}, {company.zipCode} {company.city}
                  </p>
                  {tutor && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Tuteur : {tutor.firstName} {tutor.lastName} - {tutor.function}
                      {tutor.phone && ` - ${tutor.phone}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune entreprise affectee.</p>
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
            <AlertList alerts={myAlerts} compact emptyMessage="Aucune alerte sur cet eleve." />
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
                Aucune visite enregistree.
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
                      {v.conditions || v.activities || v.tutorRemark || '-'}
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

function StudentAlerts({ alerts }: { alerts: StudentDetail['alerts'] }) {
  if (alerts.length === 0) return <InlineEmpty message="Aucune alerte sur cet eleve." />

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {alerts.map((alert) => (
        <li key={alert.id} className="py-3">
          <Badge tone={alert.severity === 'urgent' || alert.severity === 'problem' ? 'danger' : 'warning'} dot>
            {alert.severity}
          </Badge>
          <p className="mt-2 text-sm text-[var(--color-text)]">{alert.message}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {formatDate(alert.created_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function StudentVisits({ visits }: { visits: StudentDetail['visits'] }) {
  if (visits.length === 0) return <InlineEmpty message="Aucune visite enregistree." />

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {visits.map((visit) => (
        <li key={visit.id} className="py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{formatDate(visit.date)}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {visit.contact_type} - {visit.status}
              </p>
            </div>
            <Link
              to="/visits/$id"
              params={{ id: visit.id }}
              className="text-xs font-medium text-[var(--color-brand-700)]"
            >
              Ouvrir
            </Link>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
            {visit.conditions || visit.activities || visit.tutor_remark || '-'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function StudentDocuments({ documents }: { documents: StudentDetail['documents'] }) {
  if (documents.length === 0) return <InlineEmpty message="Aucun document rattache." />

  return (
    <ul className="space-y-3">
      {documents.map((document) => (
        <li key={document.id} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{document.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {document.type} - {formatDate(document.created_at)}
              </p>
            </div>
            <DocumentStatusBadge status={document.status} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function BackToStudents() {
  return (
    <Link to="/students">
      <Button variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
        Retour a la liste
      </Button>
    </Link>
  )
}

function BareDetailState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-base font-semibold text-[var(--color-text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
    </div>
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

function InlineEmpty({ message }: { message: string }) {
  return <p className="text-sm text-[var(--color-text-muted)] text-center py-4">{message}</p>
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value))
}
