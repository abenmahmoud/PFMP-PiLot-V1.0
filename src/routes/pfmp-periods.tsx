import { createFileRoute, Link, redirect, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Plus } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { PeriodStatusBadge } from '@/components/StatusBadge'
import { PeriodFormModal, periodValuesToCreateInput, type PeriodFormValues } from '@/components/pfmpPeriods/PeriodFormModal'
import { PeriodCalendarView } from '@/components/pfmpPeriods/PeriodCalendarView'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import type { ClassRow } from '@/lib/database.types'
import { createPfmpPeriod, listPfmpPeriodsForEstablishment, type PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import { listTenantStudentsAndClasses } from '@/server/tenantReference.functions'
import { classes, pfmpPeriods } from '@/data/demo'

export const Route = createFileRoute('/pfmp-periods')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/pfmp-periods' })
  },
  component: PeriodsPage,
})

const LOAD_TIMEOUT_MS = 12000

export function PeriodsPage() {
  if (isDemoMode()) return <PeriodsDemo />
  return <PeriodsSupabase />
}

function PeriodsSupabase() {
  const auth = useAuth()
  const routerState = useRouterState()
  const isProfPortal = routerState.location.pathname.startsWith('/prof')
  const [items, setItems] = useState<PfmpPeriodWithStats[]>([])
  const [classRows, setClassRows] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const [periods, references] = await Promise.all([
      listPfmpPeriodsForEstablishment({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
        },
      }),
      listTenantStudentsAndClasses({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
    ])
    setItems(periods)
    setClassRows(references.classes)
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile || !auth.session) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(reload(), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then(() => {
        if (!mounted) return
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
  }, [auth.loading, auth.profile, auth.session, auth.activeEstablishmentId])

  if (auth.loading || loading) return <PeriodsSkeleton />

  if (!auth.profile) {
    return (
      <BarePeriodsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les periodes PFMP."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Periodes PFMP" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les periodes PFMP"
          description={error}
        />
      </AppLayout>
    )
  }

  const canManage = !isProfPortal && ['admin', 'ddfpt', 'superadmin'].includes(auth.profile.role)

  async function handleCreatePeriod(values: PeriodFormValues) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSubmitting(true)
    setModalError(null)
    try {
      await createPfmpPeriod({
        data: {
          accessToken,
          data: periodValuesToCreateInput(values, auth.activeEstablishmentId),
        },
      })
      setModalOpen(false)
      await reload()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppLayout
        title="Periodes PFMP"
        subtitle={`${items.length} periodes - donnees Supabase`}
        actions={
          canManage ? (
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              Nouvelle periode
            </Button>
          ) : undefined
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-5 h-5" />}
            title="Aucune periode PFMP"
            description="Creez une periode PFMP pour suivre les affectations, visites et documents."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((item) => (
                <PeriodCard key={item.period.id} item={item} isProfPortal={isProfPortal} />
              ))}
            </div>
            <PeriodCalendarView periods={items} />
          </div>
        )}
      </AppLayout>
      <PeriodFormModal
        open={modalOpen}
        classes={classRows}
        submitting={submitting}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePeriod}
      />
    </>
  )
}

function PeriodsDemo() {
  return (
    <AppLayout
      title="Periodes PFMP"
      subtitle={`${pfmpPeriods.length} periodes - annee 2025-2026 - mode demo`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Nouvelle periode</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pfmpPeriods.map((period) => {
          const classNames = period.classIds
            .map((id) => classes.find((klass) => klass.id === id)?.name)
            .filter(Boolean)
            .join(' - ')
          return (
            <Card key={period.id}>
              <CardHeader>
                <div>
                  <CardTitle icon={<Calendar className="w-4 h-4" />}>{period.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {formatDate(period.startDate)} {'->'} {formatDate(period.endDate)} - {classNames}
                  </p>
                </div>
                <PeriodStatusBadge status={period.status} />
              </CardHeader>
              <CardBody className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Eleves" value={period.studentCount} />
                <Stat label="Affectes" value={`${period.assignmentRate}%`} />
                <Stat label="Visites" value={`${period.visitRate}%`} />
                <Stat label="Docs manquants" value={period.missingDocuments} className="col-span-3 sm:col-span-1" />
              </CardBody>
            </Card>
          )
        })}
      </div>
    </AppLayout>
  )
}

function PeriodCard({ item, isProfPortal }: { item: PfmpPeriodWithStats; isProfPortal: boolean }) {
  const classNames = item.class?.name ?? 'Aucune classe rattachee'
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Calendar className="w-4 h-4" />}>{item.period.name}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {formatDate(item.period.start_date)} {'->'} {formatDate(item.period.end_date)} - {classNames}
          </p>
        </div>
        <PeriodStatusBadge status={item.period.status} />
      </CardHeader>
      <CardBody className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Eleves" value={item.studentCount} />
                <Stat label="Dossiers" value={item.placementsCount} />
        <Stat label="Termines" value={item.completedCount} />
        {isProfPortal ? (
          <Link
            to="/prof/placements"
            className="col-span-3 mt-1 inline-flex h-8 items-center justify-center rounded-md bg-[var(--color-brand-50)] text-xs font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)]"
          >
            Voir mes affectations
          </Link>
        ) : (
          <Link
            to="/admin/pfmp-periods/$id"
            params={{ id: item.period.id }}
            className="col-span-3 mt-1 inline-flex h-8 items-center justify-center rounded-md bg-[var(--color-brand-50)] text-xs font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)]"
          >
            Ouvrir la periode
          </Link>
        )}
      </CardBody>
    </Card>
  )
}

function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-[var(--color-muted)]/50 px-3 py-2 ${className || ''}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  )
}

function PeriodsSkeleton() {
  return (
    <AppLayout title="Periodes PFMP" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="h-44 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BarePeriodsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Calendar className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
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
