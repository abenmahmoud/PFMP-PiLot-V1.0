import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, ClipboardCheck, User } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import {
  PlacementFormModal,
  type PlacementFormValues,
} from '@/components/placements/PlacementFormModal'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { PlacementTimeline } from '@/components/placements/PlacementTimeline'
import { useAuth } from '@/lib/AuthProvider'
import type { StageStatus } from '@/lib/database.types'
import { listCompaniesForEstablishment, type CompanyWithTutors } from '@/server/companies.functions'
import { updatePlacement, updatePlacementStatus } from '@/server/placements.functions'
import type { PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'
import { fetchPlacementById, type PlacementDetail } from '@/services/placements'

export const Route = createFileRoute('/admin/placements/$id')({
  component: AdminPlacementDetailPage,
})

const NEXT_STATUSES: Array<{ value: StageStatus; label: string }> = [
  { value: 'no_stage', label: 'Recherche stage' },
  { value: 'found', label: 'Entreprise proposee' },
  { value: 'confirmed', label: 'Valide DDFPT' },
  { value: 'pending_convention', label: 'Convention a signer' },
  { value: 'signed_convention', label: 'Convention signee' },
  { value: 'in_progress', label: 'En stage' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
]

function AdminPlacementDetailPage() {
  const { id } = useParams({ from: '/admin/placements/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<PlacementDetail | null>(null)
  const [companies, setCompanies] = useState<CompanyWithTutors[]>([])
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function reload() {
    const next = await fetchPlacementById(id)
    setDetail(next)
    const accessToken = auth.session?.access_token
    if (accessToken) {
      const [companyRows, teacherRows] = await Promise.all([
        listCompaniesForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
        fetchTeachersWithStats(accessToken, auth.activeEstablishmentId),
      ])
      setCompanies(companyRows)
      setTeachers(teacherRows)
    }
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

  async function handleUpdatePlacement(values: PlacementFormValues) {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    setSubmitting(true)
    setModalError(null)
    try {
      await updatePlacement({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          placementId: detail.placement.id,
          data: {
            companyId: values.companyId,
            tutorId: values.tutorId,
            referentId: values.referentId,
            startDate: values.startDate,
            endDate: values.endDate,
            status: values.status,
            notes: values.notes,
          },
        },
      })
      setEditOpen(false)
      await reload()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err))
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            Modifier dossier
          </Button>
          <Select
            value={detail.placement.status}
            onChange={(event) => void setStatus(event.target.value as StageStatus)}
            disabled={submitting}
            className="w-48"
          >
            {NEXT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </div>
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
      <PlacementFormModal
        open={editOpen}
        accessToken={auth.session?.access_token ?? ''}
        establishmentId={auth.activeEstablishmentId}
        students={detail.student ? [detail.student] : []}
        classes={[]}
        periods={detail.period ? [toPeriodWithStats(detail)] : []}
        companies={companies}
        teachers={teachers}
        initial={{
          studentId: detail.placement.student_id,
          periodId: detail.placement.period_id,
          companyId: detail.placement.company_id,
          tutorId: detail.placement.tutor_id,
          referentId: detail.placement.referent_id,
          startDate: detail.placement.start_date,
          endDate: detail.placement.end_date,
          status: detail.placement.status,
          notes: detail.placement.notes,
        }}
        lockStudentPeriod
        submitLabel="Enregistrer le dossier"
        submitting={submitting}
        error={modalError}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdatePlacement}
      />
    </AppLayout>
  )
}

function toPeriodWithStats(detail: PlacementDetail): PfmpPeriodWithStats {
  return {
    period: detail.period as NonNullable<PlacementDetail['period']>,
    class: null,
    studentCount: detail.student ? 1 : 0,
    placementsCount: 1,
    completedCount: detail.placement.status === 'completed' ? 1 : 0,
  }
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
