import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Network } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import type { StageStatus } from '@/lib/database.types'
import { listPlacementsForEstablishment, type PlacementWithRelations } from '@/server/placements.functions'

export const Route = createFileRoute('/prof/placements')({
  component: ProfPlacementsPage,
})

function ProfPlacementsPage() {
  const auth = useAuth()
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | StageStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.session || !auth.profile) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    setError(null)
    listPlacementsForEstablishment({
      data: {
        accessToken: auth.session.access_token,
        establishmentId: auth.activeEstablishmentId,
      },
    })
      .then((rows) => {
        if (mounted) setPlacements(rows)
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [auth.loading, auth.session, auth.profile, auth.activeEstablishmentId])

  const filtered = useMemo(
    () => placements.filter((item) => statusFilter === 'all' || item.placement.status === statusFilter),
    [placements, statusFilter],
  )

  if (auth.loading || loading) {
    return (
      <AppLayout title="Mes affectations" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Mes affectations" subtitle="Espace professeur">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger les affectations" description={error} />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Mes affectations" subtitle={`${filtered.length} placements visibles`}>
      <Card>
        <CardHeader>
          <CardTitle icon={<Network className="w-4 h-4" />}>Placements de mes eleves</CardTitle>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | StageStatus)} className="w-44">
            <option value="all">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="confirmed">Confirme</option>
            <option value="in_progress">En stage</option>
            <option value="completed">Termine</option>
            <option value="cancelled">Annule</option>
          </Select>
        </CardHeader>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState title="Aucun placement visible" description="Les placements apparaitront ici quand vos eleves seront affectes." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {filtered.map((item) => (
                <li key={item.placement.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve inconnu'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {item.class?.name ?? '-'} - {item.company?.name ?? 'Entreprise non affectee'}
                    </p>
                  </div>
                  <PlacementStatusBadge status={item.placement.status} />
                  <Link to="/prof/placements/$id" params={{ id: item.placement.id }} className="text-xs font-medium text-emerald-700">
                    Ouvrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  )
}
