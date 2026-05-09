import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, UserCog } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchTeachers, type TeacherListItem } from '@/services/teachers'
import { teachers, classes } from '@/data/demo'

export const Route = createFileRoute('/teachers')({ component: TeachersPage })

const TEACHER_LOAD_THRESHOLD = 6
const LOAD_TIMEOUT_MS = 12000

function TeachersPage() {
  if (isDemoMode()) return <TeachersDemo />
  return <TeachersSupabase />
}

function TeachersSupabase() {
  const auth = useAuth()
  const [rows, setRows] = useState<TeacherListItem[]>([])
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

    withTimeout(fetchTeachers(), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextRows) => {
        if (mounted) setRows(nextRows)
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

  if (auth.loading || loading) return <TeachersSkeleton />

  if (!auth.profile) {
    return (
      <BareTeachersState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les professeurs."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Professeurs" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les professeurs"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Professeurs"
      subtitle={`${rows.length} professeurs - seuil charge configure a ${TEACHER_LOAD_THRESHOLD} eleves - donnees Supabase`}
      actions={
        <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} disabled>
          Ajouter
        </Button>
      }
    >
      <TeachersTable rows={rows} />
    </AppLayout>
  )
}

function TeachersDemo() {
  return (
    <AppLayout
      title="Professeurs"
      subtitle={`${teachers.length} professeurs - seuil charge configure a ${TEACHER_LOAD_THRESHOLD} eleves - mode demo`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Ajouter</Button>}
    >
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
            header: 'Charge',
            render: (teacher) => (
              <TeacherLoadIndicator load={teacher.studentLoad} threshold={TEACHER_LOAD_THRESHOLD} />
            ),
          },
        ]}
        empty={<UserCog className="w-5 h-5" />}
      />
    </AppLayout>
  )
}

function TeachersTable({ rows }: { rows: TeacherListItem[] }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.teacher.id}
      columns={[
        {
          key: 'name',
          header: 'Professeur',
          render: (row) => (
            <TeacherIdentity
              firstName={row.teacher.first_name}
              lastName={row.teacher.last_name}
              email={row.teacher.email}
            />
          ),
        },
        {
          key: 'classes',
          header: 'Classes',
          hideOnMobile: true,
          render: (row) => row.classes.map((klass) => klass.name).join(', ') || '-',
        },
        {
          key: 'load',
          header: 'Charge',
          render: (row) => (
            <TeacherLoadIndicator load={row.studentLoad} threshold={TEACHER_LOAD_THRESHOLD} />
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
      <div className="w-8 h-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center text-xs font-semibold">
        {firstName[0]}
        {lastName[0]}
      </div>
      <div>
        <p className="font-medium">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{email ?? 'Email non renseigne'}</p>
      </div>
    </div>
  )
}

function TeachersSkeleton() {
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

function BareTeachersState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<UserCog className="w-5 h-5" />} title={title} description={description} />
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
