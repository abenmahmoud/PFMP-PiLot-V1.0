import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, ClipboardCheck, User } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { PlacementTimeline } from '@/components/placements/PlacementTimeline'
import { useAuth } from '@/lib/AuthProvider'
import { fetchPlacementById, type PlacementDetail } from '@/services/placements'

export const Route = createFileRoute('/prof/placements/$id')({
  component: ProfPlacementDetailPage,
})

function ProfPlacementDetailPage() {
  const { id } = useParams({ from: '/prof/placements/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<PlacementDetail | null>(null)
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
    fetchPlacementById(id)
      .then((next) => {
        if (mounted) setDetail(next)
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
  }, [auth.loading, auth.profile, id])

  if (auth.loading || loading) {
    return (
      <AppLayout title="Placement PFMP" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Placement PFMP" subtitle="Espace professeur">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger le placement" description={error} />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Placement introuvable" subtitle="Espace professeur">
        <EmptyState title="Placement introuvable ou inaccessible" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={detail.student ? `${detail.student.first_name} ${detail.student.last_name}` : 'Placement PFMP'}
      subtitle={detail.period?.name ?? 'Periode non renseignee'}
    >
      <div className="mb-4">
        <Link to="/prof/placements" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          Retour aux affectations
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Suivi du stage</CardTitle>
            <PlacementStatusBadge status={detail.placement.status} />
          </CardHeader>
          <CardBody className="space-y-5">
            <PlacementTimeline status={detail.placement.status} />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info icon={<User className="w-4 h-4" />} label="Eleve" value={detail.student ? `${detail.student.first_name} ${detail.student.last_name}` : '-'} />
              <Info icon={<CalendarDays className="w-4 h-4" />} label="Periode" value={detail.period?.name ?? '-'} />
              <Info icon={<Building2 className="w-4 h-4" />} label="Entreprise" value={detail.company?.name ?? 'Non affectee'} />
              <Info icon={<User className="w-4 h-4" />} label="Tuteur" value={detail.tutor ? `${detail.tutor.first_name} ${detail.tutor.last_name}` : '-'} />
              <Info icon={<CalendarDays className="w-4 h-4" />} label="Dates" value={formatDates(detail.placement.start_date, detail.placement.end_date)} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={<User className="w-4 h-4" />}>Referent</CardTitle>
          </CardHeader>
          <CardBody className="text-sm text-[var(--color-text-muted)]">
            {detail.referent ? `${detail.referent.first_name} ${detail.referent.last_name}` : 'Aucun referent affecte'}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function formatDates(start: string | null, end: string | null): string {
  if (!start || !end) return '-'
  return `${new Date(start).toLocaleDateString('fr-FR')} - ${new Date(end).toLocaleDateString('fr-FR')}`
}
