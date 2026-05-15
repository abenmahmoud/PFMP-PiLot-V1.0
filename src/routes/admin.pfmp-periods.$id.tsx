import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calendar, Plus, RefreshCw, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
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
import { isDemoMode } from '@/lib/supabase'
import type { ClassRow, PeriodStatus, StudentRow } from '@/lib/database.types'
import { listCompaniesForEstablishment, type CompanyWithTutors } from '@/server/companies.functions'
import { createPlacement, listPlacementsForPeriod, type PlacementWithRelations } from '@/server/placements.functions'
import {
  listPfmpPeriodsForEstablishment,
  syncPfmpPeriodStudentDossiers,
  updatePfmpPeriod,
  type PfmpPeriodWithStats,
} from '@/server/pfmpPeriods.functions'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'
import { listTenantStudentsAndClasses } from '@/server/tenantReference.functions'

export const Route = createFileRoute('/admin/pfmp-periods/$id')({
  component: AdminPeriodDetailPage,
})

function AdminPeriodDetailPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Periode PFMP" subtitle="Mode demo">
        <EmptyState title="Fiche periode disponible en mode Supabase" />
      </AppLayout>
    )
  }
  return <AdminPeriodDetailSupabase />
}

function AdminPeriodDetailSupabase() {
  const { id } = useParams({ from: '/admin/pfmp-periods/$id' })
  const auth = useAuth()
  const [period, setPeriod] = useState<PfmpPeriodWithStats | null>(null)
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [companies, setCompanies] = useState<CompanyWithTutors[]>([])
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const PERIOD_STATUS_OPTIONS: Array<{ value: PeriodStatus; label: string }> = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'published', label: 'Publiee' },
    { value: 'preparation', label: 'Preparation' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminee' },
    { value: 'cancelled', label: 'Annulee' },
  ]

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const [periods, placementRows, referenceRows, companyRows, teacherRows] = await Promise.all([
      listPfmpPeriodsForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      listPlacementsForPeriod({ data: { accessToken, establishmentId: auth.activeEstablishmentId, periodId: id } }),
      listTenantStudentsAndClasses({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      listCompaniesForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      fetchTeachersWithStats(accessToken, auth.activeEstablishmentId),
    ])
    setPeriod(periods.find((item) => item.period.id === id) ?? null)
    setPlacements(placementRows)
    setStudents(referenceRows.students)
    setClasses(referenceRows.classes)
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
  }, [auth.loading, auth.session, auth.profile, auth.activeEstablishmentId, id])

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

  async function handleStatusChange(status: PeriodStatus) {
    const accessToken = auth.session?.access_token
    if (!accessToken || !period) return
    setStatusSubmitting(true)
    setError(null)
    try {
      await updatePfmpPeriod({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          periodId: period.period.id,
          data: { status },
        },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStatusSubmitting(false)
    }
  }

  async function handleSyncDossiers() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !period) return
    setSubmitting(true)
    setSyncMessage(null)
    setError(null)
    try {
      const result = await syncPfmpPeriodStudentDossiers({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          periodId: period.period.id,
        },
      })
      setSyncMessage(`${result.created} dossier(s) cree(s), ${result.students} eleve(s) controles.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Periode PFMP" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Periode PFMP" subtitle="Donnees Supabase">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger la periode" description={error} />
      </AppLayout>
    )
  }

  if (!period) {
    return (
      <AppLayout title="Periode introuvable" subtitle="Donnees Supabase">
        <EmptyState title="Periode introuvable" action={<BackLink />} />
      </AppLayout>
    )
  }

  const availableStudents = period.class
    ? students.filter((student) => student.class_id === period.class?.id)
    : students

  return (
    <>
      <AppLayout
        title={period.period.name}
        subtitle={`${period.class?.name ?? 'Classe non rattachee'} - ${formatDate(period.period.start_date)} au ${formatDate(period.period.end_date)}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              className="w-44"
              value={period.period.status}
              onChange={(event) => void handleStatusChange(event.target.value as PeriodStatus)}
              disabled={statusSubmitting}
            >
              {PERIOD_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<RefreshCw className="w-4 h-4" />}
              onClick={handleSyncDossiers}
              disabled={submitting}
            >
              Creer dossiers manquants
            </Button>
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              Ajouter dossier
            </Button>
          </div>
        }
      >
        <div className="mb-4">
          <BackLink />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle icon={<Calendar className="w-4 h-4" />}>Periode</CardTitle>
              <Badge tone="brand">{period.period.status}</Badge>
            </CardHeader>
            <CardBody className="grid grid-cols-3 gap-3 text-center">
              <Metric label="Eleves" value={period.studentCount} />
              <Metric label="Dossiers" value={period.placementsCount} />
              <Metric label="Termines" value={period.completedCount} />
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<Users className="w-4 h-4" />}>Placements</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {placements.length === 0 ? (
                <EmptyState
                  title="Aucun dossier PFMP"
                  description="Les dossiers eleves sont crees automatiquement a la creation de la periode. Utilisez Creer dossiers manquants si cette periode existait deja."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {placements.map((item) => (
                    <li key={item.placement.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve inconnu'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {item.company?.name ?? 'Entreprise non affectee'} {item.tutor ? `- ${item.tutor.first_name} ${item.tutor.last_name}` : ''}
                        </p>
                      </div>
                      <PlacementStatusBadge status={item.placement.status} />
                      <Link
                        to="/admin/placements/$id"
                        params={{ id: item.placement.id }}
                        className="text-xs font-medium text-[var(--color-brand-700)]"
                      >
                        Ouvrir
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        {syncMessage && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {syncMessage}
          </p>
        )}
      </AppLayout>
      <PlacementFormModal
        open={modalOpen}
        accessToken={auth.session?.access_token ?? ''}
        establishmentId={auth.activeEstablishmentId}
        students={availableStudents}
        classes={classes}
        periods={[period]}
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

function BackLink() {
  return (
    <Link to="/admin/pfmp-periods" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-700)]">
      <ArrowLeft className="w-4 h-4" />
      Retour aux periodes
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-muted)]/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}
