import { createFileRoute, Link, Navigate, Outlet, useMatchRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchClasses, type ClassListItem } from '@/services/classes'
import { classes, profiles, students } from '@/data/demo'

export const Route = createFileRoute('/classes')({ component: ClassesPage })

const LOAD_TIMEOUT_MS = 12000

export function ClassesPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/classes/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (!matchRoute({ to: '/admin/classes', fuzzy: true })) {
    return <Navigate to="/admin/classes" replace />
  }
  if (isDemoMode()) return <ClassesDemo />
  return <ClassesSupabase />
}

export function ClassesSupabase() {
  const auth = useAuth()
  const [items, setItems] = useState<ClassListItem[]>([])
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

    withTimeout(fetchClasses(auth.profile), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextItems) => {
        if (mounted) setItems(nextItems)
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

  if (auth.loading || loading) return <ClassesSkeleton />

  if (!auth.profile) {
    return (
      <BareClassesState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les classes."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Classes" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les classes"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Classes"
      subtitle={`${items.length} classes - donnees Supabase`}
      actions={
        <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} disabled>
          Nouvelle classe
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Aucune classe"
          description="Creez une premiere classe pour rattacher les eleves, periodes PFMP et professeurs principaux."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ClassCard key={item.class.id} item={item} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

export function ClassesDemo() {
  return (
    <AppLayout
      title="Classes"
      subtitle={`${classes.length} classes - annee 2025-2026 - mode demo`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Nouvelle classe</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((klass) => {
          const inClass = students.filter((student) => student.classId === klass.id)
          const noStage = inClass.filter((student) => student.stageStatus === 'no_stage').length
          const principal = profiles.find((profile) => profile.id === klass.principalId)
          return (
            <Card key={klass.id}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Users className="w-4 h-4" />}>{klass.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{klass.formation}</p>
                </div>
                <Badge tone="brand">{klass.level}</Badge>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <Metric label="Eleves" value={inClass.length} />
                <Metric
                  label="Sans stage"
                  value={<Badge tone={noStage === 0 ? 'success' : 'warning'}>{noStage}</Badge>}
                />
                <Metric
                  label="Prof. principal"
                  value={principal ? `${principal.firstName} ${principal.lastName}` : '-'}
                />
                <ClassLinks classId={klass.id} />
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}

function ClassCard({ item }: { item: ClassListItem }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Users className="w-4 h-4" />}>{item.class.name}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.class.formation}</p>
        </div>
        <Badge tone="brand">{item.class.level}</Badge>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        <Metric label="Eleves" value={item.studentCount} />
        <Metric
          label="Sans stage"
          value={<Badge tone={item.noStageCount === 0 ? 'success' : 'warning'}>{item.noStageCount}</Badge>}
        />
        <Metric
          label="Prof. principal"
          value={
            item.principal
              ? `${item.principal.first_name} ${item.principal.last_name}`
              : 'Non renseigne'
          }
        />
        <ClassLinks classId={item.class.id} />
      </CardBody>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function ClassLinks({ classId }: { classId: string }) {
  const router = useRouterState()
  const isProfPortal = router.location.pathname.startsWith('/prof')
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Link
        to={isProfPortal ? '/prof/classes/$id' : '/admin/classes/$id'}
        params={{ id: classId }}
        className="inline-flex h-8 items-center px-3 rounded-md text-xs font-medium text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-700)]"
      >
        Codes eleves
      </Link>
      <Link
        to={isProfPortal ? '/prof/my-students' : '/admin/students'}
        className="inline-flex h-8 items-center px-3 rounded-md text-xs font-medium text-[var(--color-brand-700)] bg-[var(--color-brand-50)] hover:bg-[var(--color-brand-100)]"
      >
        Voir les eleves
      </Link>
    </div>
  )
}

function ClassesSkeleton() {
  return (
    <AppLayout title="Classes" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-56 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BareClassesState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Users className="w-5 h-5" />} title={title} description={description} />
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
