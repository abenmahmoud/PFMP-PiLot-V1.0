import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Flag } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { VisitStatusBadge } from '@/components/visits/VisitStatusBadge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { listVisitsForEstablishment, type FieldVisitWithRelations } from '@/server/visits.functions'

export const Route = createFileRoute('/admin/visits/flagged')({
  component: AdminFlaggedVisitsPage,
})

function AdminFlaggedVisitsPage() {
  const auth = useAuth()
  const [visits, setVisits] = useState<FieldVisitWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.session) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    listVisitsForEstablishment({
      data: {
        accessToken: auth.session.access_token,
        establishmentId: auth.activeEstablishmentId,
      },
    })
      .then((rows) => {
        if (mounted) setVisits(rows)
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
  }, [auth.loading, auth.session, auth.activeEstablishmentId])

  const flagged = useMemo(() => visits.filter((item) => item.visit.flagged_for_review), [visits])

  return (
    <AppLayout title="Visites a revoir" subtitle="Alertes terrain admin/DDFPT">
      <div className="space-y-5">
        <Link to="/admin/visits" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-700)]">
          <ArrowLeft className="w-4 h-4" />
          Retour visites
        </Link>
        {loading ? (
          <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ) : error ? (
          <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Lecture impossible" description={error} />
        ) : flagged.length === 0 ? (
          <EmptyState title="Aucune visite signalee" description="Les visites avec point de vigilance apparaitront ici." />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle icon={<Flag className="w-4 h-4" />}>{flagged.length} visite(s) a revoir</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-[var(--color-border)]">
                {flagged.map((item) => (
                  <li key={item.visit.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve'}</p>
                      <p className="text-xs text-red-700">{item.visit.flag_reason ?? 'Motif non renseigne'}</p>
                    </div>
                    <VisitStatusBadge status={item.visit.status} />
                    <Link to="/prof/visits/$id" params={{ id: item.visit.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
                      Ouvrir
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
