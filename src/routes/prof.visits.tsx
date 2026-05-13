import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Map, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { VisitPlanCard } from '@/components/visits/VisitPlanCard'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { listVisitsForEstablishment, type FieldVisitWithRelations } from '@/server/visits.functions'

export const Route = createFileRoute('/prof/visits')({
  component: ProfVisitsPage,
})

function ProfVisitsPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Mes visites" subtitle="Mode demo">
        <EmptyState title="Planning terrain disponible en mode Supabase" />
      </AppLayout>
    )
  }
  return <ProfVisitsSupabase />
}

function ProfVisitsSupabase() {
  const auth = useAuth()
  const [visits, setVisits] = useState<FieldVisitWithRelations[]>([])
  const [scope, setScope] = useState<'week' | 'today' | 'all'>('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const range = buildRange(scope)
    const rows = await listVisitsForEstablishment({
      data: {
        accessToken,
        establishmentId: auth.activeEstablishmentId,
        dateFrom: range.from,
        dateTo: range.to,
      },
    })
    setVisits(rows)
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.session || !auth.profile) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    setError(null)
    reload()
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [auth.loading, auth.session, auth.profile, auth.activeEstablishmentId, scope])

  const today = useMemo(() => visits.filter((item) => isToday(item.visit.scheduled_at ?? item.visit.date)), [visits])
  const planned = visits.filter((item) => item.visit.status === 'planned')
  const inProgress = visits.filter((item) => item.visit.status === 'in_progress')

  if (auth.loading || loading) {
    return (
      <AppLayout title="Mes visites" subtitle="Lecture du planning terrain...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Mes visites" subtitle="Espace professeur">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger les visites" description={error} />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Mes visites"
      subtitle={`${visits.length} visite(s) terrain visibles`}
      actions={
        <div className="flex flex-wrap gap-2">
          <OfflineIndicator />
          <Button type="button" size="sm" variant="secondary" iconLeft={<RefreshCw className="w-4 h-4" />} onClick={() => reload()}>
            Actualiser
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="Aujourd'hui" value={today.length} />
          <MetricCard label="Planifiees" value={planned.length} />
          <MetricCard label="En cours" value={inProgress.length} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle icon={<CalendarDays className="w-4 h-4" />}>Planning</CardTitle>
            <div className="flex gap-2">
              <Select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)} className="w-40">
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="all">Tout</option>
              </Select>
              <Link to="/prof/visits/tour">
                <Button type="button" size="sm" variant="secondary" iconLeft={<Map className="w-4 h-4" />}>
                  Tournee
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {visits.length === 0 ? (
              <EmptyState title="Aucune visite planifiee" description="Les visites planifiees par l'administration apparaitront ici, y compris hors-ligne apres chargement." />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {visits.map((item) => (
                  <VisitPlanCard key={item.visit.id} item={item} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function buildRange(scope: 'week' | 'today' | 'all'): { from: string | null; to: string | null } {
  if (scope === 'all') return { from: null, to: null }
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  if (scope === 'today') {
    end.setHours(23, 59, 59, 999)
  } else {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  }
  return { from: start.toISOString(), to: end.toISOString() }
}

function isToday(value: string): boolean {
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}
