import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Network, Plus } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import {
  PlacementFormModal,
  placementValuesToCreateInput,
  type PlacementFormValues,
} from '@/components/placements/PlacementFormModal'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { getSupabase, isDemoMode } from '@/lib/supabase'
import type { ClassRow, StageStatus, StudentRow } from '@/lib/database.types'
import { listCompaniesForEstablishment, type CompanyWithTutors } from '@/server/companies.functions'
import {
  createPlacement,
  listPlacementsForEstablishment,
  updatePlacementStatus,
  type PlacementWithRelations,
} from '@/server/placements.functions'
import { listPfmpPeriodsForEstablishment, type PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'

export const Route = createFileRoute('/admin/placements')({
  component: AdminPlacementsPage,
})

const STATUS_OPTIONS: Array<{ value: 'all' | StageStatus; label: string }> = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'confirmed', label: 'Confirme' },
  { value: 'in_progress', label: 'En stage' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
]

function AdminPlacementsPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Placements PFMP" subtitle="Mode demo">
        <EmptyState title="Placements PFMP disponibles en mode Supabase" />
      </AppLayout>
    )
  }
  return <AdminPlacementsSupabase />
}

function AdminPlacementsSupabase() {
  const auth = useAuth()
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([])
  const [periods, setPeriods] = useState<PfmpPeriodWithStats[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [companies, setCompanies] = useState<CompanyWithTutors[]>([])
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | StageStatus>('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const sb = getSupabase()
    const [placementRows, periodRows, studentsResult, classesResult, companyRows, teacherRows] = await Promise.all([
      listPlacementsForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      listPfmpPeriodsForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      sb.from('students').select('*').is('archived_at', null).order('last_name'),
      sb.from('classes').select('*').order('name'),
      listCompaniesForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      fetchTeachersWithStats(accessToken),
    ])
    if (studentsResult.error) throw new Error(`Lecture eleves impossible: ${studentsResult.error.message}`)
    if (classesResult.error) throw new Error(`Lecture classes impossible: ${classesResult.error.message}`)
    setPlacements(placementRows)
    setPeriods(periodRows)
    setStudents((studentsResult.data as StudentRow[]) ?? [])
    setClasses((classesResult.data as ClassRow[]) ?? [])
    setCompanies(companyRows)
    setTeachers(teacherRows)
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
  }, [auth.loading, auth.session, auth.profile, auth.activeEstablishmentId])

  const filtered = useMemo(() => {
    return placements.filter((item) => {
      if (statusFilter !== 'all' && item.placement.status !== statusFilter) return false
      if (periodFilter !== 'all' && item.placement.period_id !== periodFilter) return false
      if (classFilter !== 'all' && item.student?.class_id !== classFilter) return false
      return true
    })
  }, [classFilter, periodFilter, placements, statusFilter])

  async function handleCreatePlacement(values: PlacementFormValues) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSubmitting(true)
    setModalError(null)
    try {
      await createPlacement({
        data: {
          accessToken,
          data: placementValuesToCreateInput(values, auth.activeEstablishmentId),
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

  async function setStatus(placementId: string, status: StageStatus) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSubmitting(true)
    try {
      await updatePlacementStatus({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          placementId,
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
      <AppLayout title="Placements PFMP" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Placements PFMP" subtitle="Donnees Supabase">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger les placements" description={error} />
      </AppLayout>
    )
  }

  return (
    <>
      <AppLayout
        title="Placements PFMP"
        subtitle={`${filtered.length} placements visibles`}
        actions={
          <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Nouveau placement
          </Button>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle icon={<Network className="w-4 h-4" />}>Suivi des affectations</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | StageStatus)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                <option value="all">Toutes periodes</option>
                {periods.map((period) => (
                  <option key={period.period.id} value={period.period.id}>
                    {period.period.name}
                  </option>
                ))}
              </Select>
              <Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                <option value="all">Toutes classes</option>
                {classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.name}
                  </option>
                ))}
              </Select>
            </div>
            {filtered.length === 0 ? (
              <EmptyState title="Aucun placement" description="Creez un placement depuis cette page ou une periode PFMP." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {filtered.map((item) => (
                  <li key={item.placement.id} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve inconnu'}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {item.class?.name ?? '-'} - {item.period?.name ?? '-'} - {item.company?.name ?? 'Entreprise non affectee'}
                      </p>
                    </div>
                    <PlacementStatusBadge status={item.placement.status} />
                    <Select
                      className="w-40"
                      value={item.placement.status}
                      onChange={(event) => void setStatus(item.placement.id, event.target.value as StageStatus)}
                      disabled={submitting}
                    >
                      {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Link to="/admin/placements/$id" params={{ id: item.placement.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
                      Ouvrir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </AppLayout>
      <PlacementFormModal
        open={modalOpen}
        accessToken={auth.session?.access_token ?? ''}
        establishmentId={auth.activeEstablishmentId}
        students={students}
        classes={classes}
        periods={periods}
        companies={companies}
        teachers={teachers}
        submitting={submitting}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePlacement}
      />
    </>
  )
}
