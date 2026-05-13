import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Archive, Edit3, History, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { TeacherFormModal, type TeacherFormValues } from '@/components/teachers/TeacherFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { ROLE_LABELS } from '@/lib/permissions'
import { fetchTeacherDetail, type TeacherDetail } from '@/services/teachers'
import { archiveTeacher, updateTeacher } from '@/server/teachers.functions'

export const Route = createFileRoute('/teachers/$id')({ component: TeacherDetailPage })

function TeacherDetailPage() {
  const { id } = useParams({ from: '/teachers/$id' })
  const auth = useAuth()
  const accessToken = auth.session?.access_token ?? ''
  const [detail, setDetail] = useState<TeacherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  function reload() {
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchTeacherDetail(id, accessToken)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (auth.loading) return
    reload()
  }, [auth.loading, accessToken, id])

  async function save(values: TeacherFormValues) {
    if (!detail) return
    setSubmitting(true)
    setModalError(null)
    try {
      await updateTeacher({
        data: {
          accessToken,
          teacherId: detail.teacher.id,
          data: {
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            discipline: values.discipline,
          },
        },
      })
      setEditing(false)
      reload()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function archive() {
    if (!detail) return
    const ok = window.confirm(`Archiver ${detail.teacher.first_name} ${detail.teacher.last_name} ?`)
    if (!ok) return
    setSubmitting(true)
    try {
      await archiveTeacher({ data: { accessToken, teacherId: detail.teacher.id } })
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Professeur" subtitle="Lecture Supabase">
        <EmptyState title="Chargement du professeur" description="Lecture de l'annuaire et des affectations." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Professeur" subtitle="Annuaire">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger le professeur"
          description={error}
          action={<BackToTeachers />}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Professeur introuvable" subtitle="Annuaire">
        <EmptyState
          title="Professeur introuvable"
          description="Ce professeur est archive, inexistant ou inaccessible."
          action={<BackToTeachers />}
        />
      </AppLayout>
    )
  }

  const teacher = detail.teacher
  const canManage =
    auth.profile?.role === 'admin' ||
    auth.profile?.role === 'ddfpt' ||
    auth.profile?.role === 'superadmin'

  return (
    <AppLayout
      title={`${teacher.first_name} ${teacher.last_name}`}
      subtitle={teacher.discipline ?? 'Annuaire professeurs'}
      actions={
        <div className="flex gap-2">
          <BackToTeachers />
          {canManage && (
            <>
              <Button size="sm" variant="secondary" iconLeft={<Edit3 className="w-4 h-4" />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
              <Button size="sm" variant="ghost" iconLeft={<Archive className="w-4 h-4" />} onClick={archive} disabled={submitting}>
                Archiver
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Identite</CardTitle>
            {teacher.role ? <Badge tone="success">{ROLE_LABELS[teacher.role]}</Badge> : <Badge tone="warning">Sans compte</Badge>}
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Info label="Email" value={teacher.email ?? '-'} />
            <Info label="Telephone" value={teacher.phone ?? '-'} />
            <Info label="Discipline" value={teacher.discipline ?? '-'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<Users className="w-4 h-4" />}>Classes principales</CardTitle>
            <Badge tone="brand">{detail.classes.length}</Badge>
          </CardHeader>
          <CardBody>
            {detail.classes.length === 0 ? (
              <InlineEmpty message="Aucune classe rattachee." />
            ) : (
              <ul className="space-y-2">
                {detail.classes.map((klass) => (
                  <li key={klass.id}>
                    <Link to="/classes/$id" params={{ id: klass.id }} className="text-sm font-medium text-[var(--color-brand-700)]">
                      {klass.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eleves suivis</CardTitle>
            <Badge tone="info">{detail.students.length}</Badge>
          </CardHeader>
          <CardBody>
            {detail.students.length === 0 ? (
              <InlineEmpty message="Aucun eleve en referent." />
            ) : (
              <ul className="space-y-2">
                {detail.students.slice(0, 12).map((student) => (
                  <li key={student.id}>
                    <Link to="/students/$id" params={{ id: student.id }} className="text-sm font-medium text-[var(--color-brand-700)]">
                      {student.first_name} {student.last_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle icon={<History className="w-4 h-4" />}>Historique</CardTitle>
          </CardHeader>
          <CardBody>
            {detail.auditLogs.length === 0 ? (
              <InlineEmpty message="Aucune action recente." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {detail.auditLogs.map((log) => (
                  <li key={log.id} className="py-3 text-sm">
                    <p className="font-medium text-[var(--color-text)]">{log.action}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{formatDate(log.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {editing && (
        <TeacherFormModal
          teacher={teacher}
          submitting={submitting}
          error={modalError}
          onCancel={() => {
            setEditing(false)
            setModalError(null)
          }}
          onSubmit={save}
        />
      )}
    </AppLayout>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="font-medium text-[var(--color-text)]">{value}</p>
    </div>
  )
}

function InlineEmpty({ message }: { message: string }) {
  return <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">{message}</p>
}

function BackToTeachers() {
  return (
    <Link to="/teachers">
      <Button size="sm" variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
        Retour
      </Button>
    </Link>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

