import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calendar, ClipboardCheck, User } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { AlertLevelBadge, DocumentStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { CONTACT_TYPE_LABELS } from '@/types'
import { fetchVisitById, validateVisit, type VisitDetail } from '@/services/visits'
import { students, teachers, visits } from '@/data/demo'

export const Route = createFileRoute('/visits/$id')({ component: VisitDetailPage })

function VisitDetailPage() {
  if (isDemoMode()) return <VisitDetailDemo />
  return <VisitDetailSupabase />
}

function VisitDetailSupabase() {
  const { id } = useParams({ from: '/visits/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<VisitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
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

    fetchVisitById(id)
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

  async function handleValidate() {
    if (!detail) return
    setValidating(true)
    setError(null)
    try {
      const visit = await validateVisit(detail.visit.id)
      setDetail({ ...detail, visit })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setValidating(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Visite" subtitle="Lecture des donnees Supabase...">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
          <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        </div>
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Visite" subtitle="Session requise">
        <EmptyState
          title="Session requise"
          description="Connectez-vous avec un compte Supabase pour afficher cette visite."
          action={<BackToDashboard />}
        />
      </AppLayout>
    )
  }

  if (error && !detail) {
    return (
      <AppLayout title="Visite" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger la visite"
          description={error}
          action={<BackToDashboard />}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Visite introuvable" subtitle="Donnees Supabase">
        <EmptyState
          title="Visite introuvable ou inaccessible"
          description="Cette visite n'existe pas ou n'est pas visible dans votre tenant."
          action={<BackToDashboard />}
        />
      </AppLayout>
    )
  }

  return (
    <VisitDetailLayout
      detail={detail}
      role={auth.role}
      validationError={error}
      validating={validating}
      onValidate={handleValidate}
    />
  )
}

function VisitDetailDemo() {
  const { id } = useParams({ from: '/visits/$id' })
  const v = visits.find((x) => x.id === id)
  if (!v) {
    return (
      <AppLayout title="Visite introuvable" subtitle="Mode demo">
        <EmptyState title="Visite introuvable" action={<BackToDashboard />} />
      </AppLayout>
    )
  }

  const student = students.find((s) => s.id === v.studentId)
  const teacher = teachers.find((t) => t.id === v.teacherId)
  const docStatus = v.status === 'validated' ? 'validated' : v.status === 'archived' ? 'archived' : 'draft'

  return (
    <AppLayout
      title={`Visite - ${student?.firstName} ${student?.lastName}`}
      subtitle={new Date(v.date).toLocaleDateString('fr-FR')}
    >
      <VisitContent
        status={docStatus}
        conditions={v.conditions}
        activities={v.activities}
        professionalPosture={v.professionalPosture}
        positives={v.positives}
        difficulties={v.difficulties}
        tutorRemark={v.tutorRemark}
        teacherRemark={v.teacherRemark}
        nextAction={v.nextAction}
        studentName={student ? `${student.firstName} ${student.lastName}` : '-'}
        teacherName={teacher ? `${teacher.firstName} ${teacher.lastName}` : '-'}
        date={v.date}
        contactType={v.contactType}
        studentPresent={v.studentPresent}
        tutorMet={v.tutorMet}
        alertLevel={v.alertLevel}
      />
    </AppLayout>
  )
}

function VisitDetailLayout({
  detail,
  role,
  validationError,
  validating,
  onValidate,
}: {
  detail: VisitDetail
  role: string | null
  validationError: string | null
  validating: boolean
  onValidate: () => void
}) {
  const { visit, student, teacher, period, reports } = detail
  const canValidate = ['admin', 'ddfpt', 'principal', 'superadmin'].includes(role ?? '') && visit.status === 'draft'
  const docStatus = visit.status === 'validated' ? 'validated' : visit.status === 'archived' ? 'archived' : 'draft'

  return (
    <AppLayout
      title={`Visite - ${student ? `${student.first_name} ${student.last_name}` : 'eleve non accessible'}`}
      subtitle={`${formatDate(visit.date)}${period ? ` - ${period.name}` : ''}`}
      actions={
        canValidate ? (
          <Button size="sm" onClick={onValidate} disabled={validating}>
            {validating ? 'Validation...' : 'Valider'}
          </Button>
        ) : undefined
      }
    >
      {validationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      )}
      <VisitContent
        status={docStatus}
        conditions={visit.conditions}
        activities={visit.activities}
        professionalPosture={visit.professional_posture}
        positives={visit.positives}
        difficulties={visit.difficulties}
        tutorRemark={visit.tutor_remark}
        teacherRemark={visit.teacher_remark}
        nextAction={visit.next_action}
        studentName={student ? `${student.first_name} ${student.last_name}` : '-'}
        teacherName={teacher ? `${teacher.first_name} ${teacher.last_name}` : '-'}
        date={visit.date}
        contactType={visit.contact_type}
        studentPresent={visit.student_present}
        tutorMet={visit.tutor_met}
        alertLevel={visit.alert_level}
        reportBody={reports[0]?.body}
      />
    </AppLayout>
  )
}

function VisitContent({
  status,
  conditions,
  activities,
  professionalPosture,
  positives,
  difficulties,
  tutorRemark,
  teacherRemark,
  nextAction,
  studentName,
  teacherName,
  date,
  contactType,
  studentPresent,
  tutorMet,
  alertLevel,
  reportBody,
}: {
  status: 'missing' | 'draft' | 'validated' | 'archived'
  conditions: string | null | undefined
  activities: string | null | undefined
  professionalPosture: string | null | undefined
  positives: string | null | undefined
  difficulties: string | null | undefined
  tutorRemark: string | null | undefined
  teacherRemark: string | null | undefined
  nextAction: string | null | undefined
  studentName: string
  teacherName: string
  date: string
  contactType: keyof typeof CONTACT_TYPE_LABELS
  studentPresent: boolean | null | undefined
  tutorMet: boolean | null | undefined
  alertLevel: 'none' | 'vigilance' | 'problem' | 'urgent'
  reportBody?: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Compte rendu</CardTitle>
          <DocumentStatusBadge status={status} />
        </CardHeader>
        <CardBody className="space-y-4 text-sm">
          {reportBody && <Section title="Rapport valide" body={reportBody} />}
          <Section title="Conditions de stage" body={conditions} />
          <Section title="Activites realisees" body={activities} />
          <Section title="Posture professionnelle" body={professionalPosture} />
          <Section title="Points positifs" body={positives} />
          <Section title="Difficultes" body={difficulties} />
          <Section title="Remarque tuteur" body={tutorRemark} />
          <Section title="Remarque professeur" body={teacherRemark} />
          <Section title="Prochaine action" body={nextAction} />
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Metadonnees</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row icon={<User className="w-3.5 h-3.5" />} label="Eleve" value={studentName} />
            <Row icon={<User className="w-3.5 h-3.5" />} label="Professeur" value={teacherName} />
            <Row icon={<Calendar className="w-3.5 h-3.5" />} label="Date" value={formatDate(date)} />
            <Row label="Type de contact" value={CONTACT_TYPE_LABELS[contactType]} />
            <Row label="Eleve present" value={<BooleanBadge value={studentPresent} trueLabel="Oui" falseLabel="Non" />} />
            <Row label="Tuteur rencontre" value={<BooleanBadge value={tutorMet} trueLabel="Oui" falseLabel="Non" />} />
            <Row label="Niveau d'alerte" value={<AlertLevelBadge level={alertLevel} />} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Section({ title, body }: { title: string; body?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
        {title}
      </p>
      <p className="text-[var(--color-text)] whitespace-pre-line">
        {body || <span className="text-[var(--color-text-subtle)]">- non renseigne -</span>}
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function BooleanBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean | null | undefined
  trueLabel: string
  falseLabel: string
}) {
  if (value == null) return <Badge tone="neutral">Non renseigne</Badge>
  return <Badge tone={value ? 'success' : 'warning'}>{value ? trueLabel : falseLabel}</Badge>
}

function BackToDashboard() {
  return (
    <Link to="/dashboard">
      <Button iconLeft={<ArrowLeft className="w-4 h-4" />} variant="secondary">
        Retour
      </Button>
    </Link>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value))
}
