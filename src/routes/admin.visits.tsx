import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, Flag, Plus, Route as RouteIcon } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { VisitStatusBadge } from '@/components/visits/VisitStatusBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label, Select, Input } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import type { VisitStatus, VisitType } from '@/lib/database.types'
import { listPlacementsForEstablishment, type PlacementWithRelations } from '@/server/placements.functions'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'
import { listVisitsForEstablishment, planVisit, type FieldVisitWithRelations } from '@/server/visits.functions'

export const Route = createFileRoute('/admin/visits')({
  component: AdminVisitsPage,
})

const STATUS_OPTIONS: Array<{ value: 'all' | VisitStatus; label: string }> = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'planned', label: 'Planifiees' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminees' },
  { value: 'cancelled', label: 'Annulees' },
  { value: 'no_show', label: 'Absences' },
]

function AdminVisitsPage() {
  const auth = useAuth()
  const [visits, setVisits] = useState<FieldVisitWithRelations[]>([])
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([])
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [status, setStatus] = useState<'all' | VisitStatus>('all')
  const [placementId, setPlacementId] = useState('')
  const [referentId, setReferentId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [type, setType] = useState<VisitType>('mi_parcours')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const [visitRows, placementRows, teacherRows] = await Promise.all([
      listVisitsForEstablishment({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          status: status === 'all' ? null : status,
        },
      }),
      listPlacementsForEstablishment({ data: { accessToken, establishmentId: auth.activeEstablishmentId } }),
      fetchTeachersWithStats(accessToken),
    ])
    setVisits(visitRows)
    setPlacements(placementRows)
    setTeachers(teacherRows.filter((teacher) => teacher.profile_id && ['referent', 'principal', 'admin', 'ddfpt'].includes(teacher.role ?? '')))
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
  }, [auth.loading, auth.session, auth.profile, auth.activeEstablishmentId, status])

  const flagged = useMemo(() => visits.filter((item) => item.visit.flagged_for_review), [visits])

  async function handlePlan() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !placementId || !scheduledAt) return
    setSaving(true)
    setError(null)
    try {
      await planVisit({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          placementId,
          referentId: referentId || null,
          scheduledAt,
          type,
        },
      })
      setPlacementId('')
      setScheduledAt('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Visites terrain" subtitle="Lecture des donnees...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error && visits.length === 0) {
    return (
      <AppLayout title="Visites terrain" subtitle="Administration">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger les visites" description={error} />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Visites terrain"
      subtitle={`${visits.length} visite(s) suivies`}
      actions={
        <Link to="/admin/visits/flagged">
          <Button type="button" size="sm" variant="secondary" iconLeft={<Flag className="w-4 h-4" />}>
            {flagged.length} a revoir
          </Button>
        </Link>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle icon={<CalendarPlus className="w-4 h-4" />}>Planifier une visite</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label>Placement</Label>
              <Select value={placementId} onChange={(event) => setPlacementId(event.target.value)}>
                <option value="">Choisir un placement</option>
                {placements.map((item) => (
                  <option key={item.placement.id} value={item.placement.id}>
                    {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve'} - {item.company?.name ?? 'Entreprise'}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Referent</Label>
              <Select value={referentId} onChange={(event) => setReferentId(event.target.value)}>
                <option value="">Referent du placement</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.profile_id ?? teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date/heure</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onChange={(event) => setType(event.target.value as VisitType)}>
                <option value="mi_parcours">Mi-parcours</option>
                <option value="fin_stage">Fin stage</option>
                <option value="urgence">Urgence</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
            <div className="lg:col-span-5">
              <Button type="button" iconLeft={<Plus className="w-4 h-4" />} onClick={handlePlan} disabled={saving || !placementId || !scheduledAt}>
                {saving ? 'Planification...' : 'Planifier'}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<RouteIcon className="w-4 h-4" />}>Toutes les visites</CardTitle>
            <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | VisitStatus)} className="w-44">
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </CardHeader>
          <CardBody className="p-0">
            {visits.length === 0 ? (
              <EmptyState title="Aucune visite" description="Planifiez une visite depuis un placement PFMP." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {visits.map((item) => (
                  <li key={item.visit.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {item.company?.name ?? 'Entreprise non affectee'} - {formatDate(item.visit.scheduled_at ?? item.visit.date)}
                      </p>
                    </div>
                    {item.visit.flagged_for_review && <Flag className="w-4 h-4 text-red-600" />}
                    <VisitStatusBadge status={item.visit.status} />
                    <Link to="/prof/visits/$id" params={{ id: item.visit.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
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
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
