import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, ClipboardCheck, User } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { PlacementTimeline } from '@/components/placements/PlacementTimeline'
import { useAuth } from '@/lib/AuthProvider'
import type { StageStatus } from '@/lib/database.types'
import { updatePlacementStatus } from '@/server/placements.functions'
import { fetchPlacementById, type PlacementDetail } from '@/services/placements'

export const Route = createFileRoute('/admin/placements/$id')({
  component: AdminPlacementDetailPage,
})

const NEXT_STATUSES: Array<{ value: StageStatus; label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'confirmed', label: 'Confirme' },
  { value: 'in_progress', label: 'En stage' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
]

function AdminPlacementDetailPage() {
  const { id } = useParams({ from: '/admin/placements/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<PlacementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function reload() {
    const next = await fetchPlacementById(id)
    setDetail(next)
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
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
  }, [auth.loading, auth.profile, id])

  async function setStatus(status: StageStatus) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSubmitting(true)
    setError(null)
    try {
      await updatePlacementStatus({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          placementId: id,
          status,
        },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Placement PFMP" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Placement PFMP" subtitle="Donnees Supabase">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger le placement" description={error} />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Placement introuvable" subtitle="Donnees Supabase">
        <EmptyState title="Placement introuvable" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={detail.student ? `${detail.student.first_name} ${detail.student.last_name}` : 'Placement PFMP'}
      subtitle={detail.period?.name ?? 'Periode non renseignee'}
      actions={
        <Select
          value={detail.placement.status}
          onChange={(event) => void setStatus(event.target.value as StageStatus)}
          disabled={submitting}
          className="w-44"
        >
          {NEXT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      }
    >
      <div className="mb-4">
        <Link to="/admin/placements" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-700)]">
          <ArrowLeft className="w-4 h-4" />
          Retour aux placements
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Workflow PFMP</CardTitle>
            <PlacementStatusBadge status={detail.placement.status} />
          </CardHeader>
          <CardBody className="space-y-5">
            <PlacementTimeline status={detail.placement.status} />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info icon={<User className="w-4 h-4" />} label="Eleve" value={detail.student ? `${detail.student.first_name} ${detail.student.last_name}` : '-'} />
              <Info icon={<CalendarDays className="w-4 h-4" />} label="Periode" value={detail.period?.name ?? '-'} />
              <Info icon={<Building2 className="w-4 h-4" />} label="Entreprise" value={detail.company?.name ?? 'Non affectee'} />
              <Info icon={<User className="w-4 h-4" />} label="Tuteur" value={detail.tutor ? `${detail.tutor.first_name} ${detail.tutor.last_name}` : '-'} />
              <Info icon={<User className="w-4 h-4" />} label="Referent" value={detail.referent ? `${detail.referent.first_name} ${detail.referent.last_name}` : '-'} />
              <Info icon={<CalendarDays className="w-4 h-4" />} label="Dates" value={formatDates(detail.placement.start_date, detail.placement.end_date)} />
            </div>
            {detail.placement.notes && (
              <div className="rounded-lg bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                {detail.placement.notes}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={<Building2 className="w-4 h-4" />}>Entreprise</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {detail.company ? (
              <>
                <p className="font-medium">{detail.company.name}</p>
                <p className="text-[var(--color-text-muted)]">{[detail.company.address, detail.company.zip_code, detail.company.city].filter(Boolean).join(' ')}</p>
                {detail.company.phone && <p>{detail.company.phone}</p>}
                {detail.company.email && <p>{detail.company.email}</p>}
              </>
            ) : (
              <p className="text-[var(--color-text-muted)]">Aucune entreprise rattachee.</p>
            )}
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
