import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { TourOptimizer } from '@/components/visits/TourOptimizer'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { getReferentTourSuggestion, type TourSuggestion } from '@/server/visits.functions'

export const Route = createFileRoute('/prof/visits/tour')({
  component: ProfVisitsTourPage,
})

function ProfVisitsTourPage() {
  const auth = useAuth()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [suggestion, setSuggestion] = useState<TourSuggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const next = await getReferentTourSuggestion({
      data: {
        accessToken,
        establishmentId: auth.activeEstablishmentId,
        date,
      },
    })
    setSuggestion(next)
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.session) {
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
  }, [auth.loading, auth.session, auth.activeEstablishmentId, date])

  return (
    <AppLayout title="Tournee du jour" subtitle="Ordre de visite optimise" actions={<OfflineIndicator />}>
      <div className="space-y-5">
        <Link to="/prof/visits" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          Retour planning
        </Link>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <Button type="button" variant="secondary" iconLeft={<Calendar className="w-4 h-4" />} onClick={() => reload()}>
            Recalculer
          </Button>
        </div>
        {loading ? (
          <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ) : error ? (
          <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Tournee indisponible" description={error} />
        ) : suggestion && suggestion.route.length > 0 ? (
          <TourOptimizer suggestion={suggestion} />
        ) : (
          <EmptyState title="Aucune visite ce jour" description="Planifiez des visites puis revenez ici pour optimiser l'ordre de tournee." />
        )}
      </div>
    </AppLayout>
  )
}
