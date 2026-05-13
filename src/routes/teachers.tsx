import { Outlet, createFileRoute, Link, useMatchRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, Archive, Edit3, FileSpreadsheet, Mail, Plus, UserCog } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { TeacherFormModal, type TeacherFormValues } from '@/components/teachers/TeacherFormModal'
import { TeacherImportModal } from '@/components/teachers/TeacherImportModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/AuthProvider'
import { ROLE_LABELS } from '@/lib/permissions'
import { isDemoMode } from '@/lib/supabase'
import { fetchTeachersWithStats } from '@/services/teachers'
import {
  archiveTeacher,
  createTeacher,
  importTeachers,
  updateTeacher,
  type TeacherImportRow,
  type TeacherWithStats,
} from '@/server/teachers.functions'
import { teachers, classes } from '@/data/demo'

export const Route = createFileRoute('/teachers')({ component: TeachersPage })

const LOAD_TIMEOUT_MS = 12000

function TeachersPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/teachers/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (isDemoMode()) return <TeachersDemo />
  return <TeachersSupabase />
}

function TeachersSupabase() {
  const auth = useAuth()
  const accessToken = auth.session?.access_token ?? ''
  const [rows, setRows] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<TeacherWithStats | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)

  function reload() {
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    withTimeout(fetchTeachersWithStats(accessToken), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (auth.loading) return
    reload()
  }, [auth.loading, accessToken])

  const canManage =
    auth.profile?.role === 'admin' ||
    auth.profile?.role === 'ddfpt' ||
    auth.profile?.role === 'superadmin'

  async function saveTeacher(values: TeacherFormValues) {
    setSubmitting(true)
    setModalError(null)
    try {
      if (editing) {
        await updateTeacher({
          data: {
            accessToken,
            teacherId: editing.id,
            data: {
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone,
              discipline: values.discipline,
            },
          },
        })
        setNotice('Professeur mis a jour.')
      } else {
        await createTeacher({ data: { accessToken, data: values } })
        setNotice(values.sendInvitation ? 'Professeur cree et invitation envoyee.' : 'Professeur cree.')
      }
      setShowCreate(false)
      setEditing(null)
      reload()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function archive(row: TeacherWithStats) {
    const ok = window.confirm(`Archiver ${row.first_name} ${row.last_name} ?`)
    if (!ok) return
    setSubmitting(true)
    setError(null)
    try {
      await archiveTeacher({ data: { accessToken, teacherId: row.id } })
      setNotice('Professeur archive.')
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function invite(row: TeacherWithStats) {
    if (!row.email) return
    setSubmitting(true)
    setError(null)
    try {
      await createTeacher({
        data: {
          accessToken,
          data: {
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            discipline: row.discipline,
            sendInvitation: true,
          },
        },
      })
      setNotice('Invitation envoyee.')
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function importRows(importRows: TeacherImportRow[]) {
    setSubmitting(true)
    setModalError(null)
    try {
      let created = 0
      let updated = 0
      let skipped = 0
      for (let index = 0; index < importRows.length; index += 200) {
        const result = await importTeachers({
          data: { accessToken, rows: importRows.slice(index, index + 200) },
        })
        created += result.created
        updated += result.updated
        skipped += result.skipped
      }
      setNotice(`${created} crees, ${updated} mis a jour, ${skipped} ignores.`)
      setShowImport(false)
      reload()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Professeurs" subtitle="Lecture des donnees Supabase...">
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-12 rounded-md bg-[var(--color-muted)] animate-pulse" />
          ))}
        </div>
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <BareTeachersState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les professeurs."
      />
    )
  }

  if (!['admin', 'ddfpt', 'principal', 'superadmin'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Professeurs" subtitle="Annuaire etablissement">
        <EmptyState
          icon={<UserCog className="w-5 h-5" />}
          title="Acces reserve"
          description="L'annuaire professeurs est reserve aux equipes de pilotage de l'etablissement."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Professeurs"
      subtitle={`${rows.length} professeur(s) - donnees Supabase`}
      actions={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" iconLeft={<FileSpreadsheet className="w-4 h-4" />} onClick={() => setShowImport(true)}>
              Importer CSV/XLSX
            </Button>
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              Ajouter
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <TeachersTable
          rows={rows}
          canManage={canManage}
          submitting={submitting}
          onEdit={setEditing}
          onArchive={archive}
          onInvite={invite}
        />
      </div>

      {(showCreate || editing) && (
        <TeacherFormModal
          teacher={editing}
          submitting={submitting}
          error={modalError}
          onCancel={() => {
            setShowCreate(false)
            setEditing(null)
            setModalError(null)
          }}
          onSubmit={saveTeacher}
        />
      )}
      {showImport && (
        <TeacherImportModal
          submitting={submitting}
          error={modalError}
          onCancel={() => {
            setShowImport(false)
            setModalError(null)
          }}
          onImport={importRows}
        />
      )}
    </AppLayout>
  )
}

function TeachersDemo() {
  return (
    <AppLayout title="Professeurs" subtitle={`${teachers.length} professeurs - mode demo`}>
      <DataTable
        rows={teachers}
        rowKey={(row) => row.id}
        columns={[
          {
            key: 'name',
            header: 'Professeur',
            render: (teacher) => (
              <TeacherIdentity
                firstName={teacher.firstName}
                lastName={teacher.lastName}
                email={teacher.email}
              />
            ),
          },
          {
            key: 'classes',
            header: 'Classes',
            hideOnMobile: true,
            render: (teacher) =>
              teacher.classes
                .map((id) => classes.find((klass) => klass.id === id)?.name)
                .filter(Boolean)
                .join(', ') || '-',
          },
          {
            key: 'load',
            header: 'Eleves referent',
            render: (teacher) => <Badge tone="neutral">{teacher.studentLoad}</Badge>,
          },
        ]}
        empty={<UserCog className="w-5 h-5" />}
      />
    </AppLayout>
  )
}

function TeachersTable({
  rows,
  canManage,
  submitting,
  onEdit,
  onArchive,
  onInvite,
}: {
  rows: TeacherWithStats[]
  canManage: boolean
  submitting: boolean
  onEdit: (row: TeacherWithStats) => void
  onArchive: (row: TeacherWithStats) => void
  onInvite: (row: TeacherWithStats) => void
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      columns={[
        {
          key: 'name',
          header: 'Professeur',
          render: (row) => (
            <Link to="/teachers/$id" params={{ id: row.id }}>
              <TeacherIdentity firstName={row.first_name} lastName={row.last_name} email={row.email} />
            </Link>
          ),
        },
        {
          key: 'discipline',
          header: 'Discipline',
          hideOnMobile: true,
          render: (row) => row.discipline ?? '-',
        },
        {
          key: 'role',
          header: 'Compte',
          render: (row) =>
            row.role ? <Badge tone="success">{ROLE_LABELS[row.role]}</Badge> : <Badge tone="warning">Sans compte</Badge>,
        },
        {
          key: 'classes',
          header: 'Classes',
          hideOnMobile: true,
          render: (row) =>
            row.principal_of_classes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {row.principal_of_classes.map((name) => (
                  <Badge key={name} tone="brand">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              '-'
            ),
        },
        {
          key: 'load',
          header: 'Eleves referent',
          render: (row) => <Badge tone={row.referent_of_count ? 'info' : 'neutral'}>{row.referent_of_count}</Badge>,
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          render: (row) =>
            canManage ? (
              <div className="flex justify-end gap-1">
                {!row.profile_id && row.email && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    iconLeft={<Mail className="w-3.5 h-3.5" />}
                    onClick={() => onInvite(row)}
                    disabled={submitting}
                  >
                    Inviter
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  iconLeft={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => onEdit(row)}
                  disabled={submitting}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  iconLeft={<Archive className="w-3.5 h-3.5" />}
                  onClick={() => onArchive(row)}
                  disabled={submitting}
                >
                  Archiver
                </Button>
              </div>
            ) : (
              <Link to="/teachers/$id" params={{ id: row.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
                Voir
              </Link>
            ),
        },
      ]}
      empty={
        <EmptyState
          icon={<UserCog className="w-5 h-5" />}
          title="Aucun professeur"
          description="Ajoutez les enseignants de l'etablissement pour organiser les affectations et visites."
        />
      }
    />
  )
}

function TeacherIdentity({
  firstName,
  lastName,
  email,
}: {
  firstName: string
  lastName: string
  email: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-xs font-semibold text-[var(--color-brand-700)]">
        {firstName[0]}
        {lastName[0]}
      </div>
      <div>
        <p className="font-medium text-[var(--color-text)]">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{email ?? 'Email non renseigne'}</p>
      </div>
    </div>
  )
}

function BareTeachersState({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="w-full max-w-lg">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
