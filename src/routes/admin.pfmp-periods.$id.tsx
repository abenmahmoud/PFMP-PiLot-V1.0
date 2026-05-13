import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calendar, Plus, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  PlacementFormModal,
  placementValuesToCreateInput,
  type PlacementFormValues,
} from '@/components/placements/PlacementFormModal'
import { PlacementStatusBadge } from '@/components/placements/PlacementStatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { getSupabase, isDemoMode } from '@/lib/supabase'
import type { ClassRow, StudentRow } from '@/lib/database.types'
import { listCompaniesForEstablishment, type CompanyWithTutors } from '@/server/companies.functions'
import { createPlacement, listPlacementsForPeriod, type PlacementWithRelations } from '@/server/placements.functions'
import { listPfmpPeriodsForEstablishment, type PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'

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

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const sb = getSupabase()
    const [periods, placementRows, studentsResult, classesResult, companyRows, teacherRows] = await Promise.all([
      listPfmpPeriodsForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      listPlacementsForPeriod({ data: { accessToken, establishmentId: auth.activeEstablishmentId, periodId: id } }),
      sb.from('students').select('*').is('archived_at', null).order('last_name'),
      sb.from('classes').select('*').order('name'),
      listCompaniesForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      fetchTeachersWithStats(accessToken),
    ])
    if (studentsResult.error) throw new Error(`Lecture eleves impossible: ${studentsResult.error.message}`)
    if (classesResult.error) throw new Error(`Lecture classes impossible: ${classesResult.error.message}`)
    setPeriod(periods.find((item) => item.period.id === id) ?? null)
    setPlacements(placementRows)
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
          <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Affecter eleve
          </Button>
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
              <Metric label="Placements" value={period.placementsCount} />
              <Metric label="Termines" value={period.completedCount} />
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<Users className="w-4 h-4" />}>Placements</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {placements.length === 0 ? (
                <EmptyState title="Aucun placement" description="Affectez les eleves a une entreprise pour demarrer la campagne PFMP." />
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
