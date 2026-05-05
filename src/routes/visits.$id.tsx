import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, ClipboardCheck, User, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertLevelBadge, DocumentStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { CONTACT_TYPE_LABELS } from '@/types'
import { EmptyState } from '@/components/EmptyState'
import { students, teachers, visits } from '@/data/demo'

export const Route = createFileRoute('/visits/$id')({ component: VisitDetailPage })

function VisitDetailPage() {
  const { id } = useParams({ from: '/visits/$id' })
  const v = visits.find((x) => x.id === id)
  if (!v) {
    return (
      <AppLayout title="Visite introuvable">
        <EmptyState
          title="Visite introuvable"
          action={
            <Link to="/dashboard">
              <Button iconLeft={<ArrowLeft className="w-4 h-4" />} variant="secondary">
                Retour
              </Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  const student = students.find((s) => s.id === v.studentId)
  const teacher = teachers.find((t) => t.id === v.teacherId)
  const docStatus =
    v.status === 'validated' ? 'validated' : v.status === 'archived' ? 'archived' : 'draft'

  return (
    <AppLayout
      title={`Visite — ${student?.firstName} ${student?.lastName}`}
      subtitle={new Date(v.date).toLocaleDateString('fr-FR')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Compte rendu</CardTitle>
            <DocumentStatusBadge status={docStatus} />
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <Section title="Conditions de stage" body={v.conditions} />
            <Section title="Activités réalisées" body={v.activities} />
            <Section title="Posture professionnelle" body={v.professionalPosture} />
            <Section title="Points positifs" body={v.positives} />
            <Section title="Difficultés" body={v.difficulties} />
            <Section title="Remarque tuteur" body={v.tutorRemark} />
            <Section title="Remarque professeur" body={v.teacherRemark} />
            <Section title="Prochaine action" body={v.nextAction} />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row icon={<User className="w-3.5 h-3.5" />} label="Élève" value={`${student?.firstName} ${student?.lastName}`} />
              <Row icon={<User className="w-3.5 h-3.5" />} label="Professeur" value={`${teacher?.firstName} ${teacher?.lastName}`} />
              <Row icon={<Calendar className="w-3.5 h-3.5" />} label="Date" value={new Date(v.date).toLocaleDateString('fr-FR')} />
              <Row label="Type de contact" value={CONTACT_TYPE_LABELS[v.contactType]} />
              <Row label="Élève présent" value={<Badge tone={v.studentPresent ? 'success' : 'danger'}>{v.studentPresent ? 'Oui' : 'Non'}</Badge>} />
              <Row label="Tuteur rencontré" value={<Badge tone={v.tutorMet ? 'success' : 'warning'}>{v.tutorMet ? 'Oui' : 'Non'}</Badge>} />
              <Row label="Niveau d'alerte" value={<AlertLevelBadge level={v.alertLevel} />} />
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

function Section({ title, body }: { title: string; body?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
        {title}
      </p>
      <p className="text-[var(--color-text)] whitespace-pre-line">
        {body || <span className="text-[var(--color-text-subtle)]">— non renseigné —</span>}
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
