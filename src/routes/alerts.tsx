import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bell, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import { AlertLevelBadge } from '@/components/StatusBadge'
import { AlertList } from '@/components/AlertList'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchAlerts, resolveAlert } from '@/services/alerts'
import type { AlertRow } from '@/lib/database.types'
import { alerts as allAlerts } from '@/data/demo'

export const Route = createFileRoute('/alerts')({ component: AlertsPage })

const LOAD_TIMEOUT_MS = 12000

type AlertTab = 'active' | 'urgent' | 'problem' | 'vigilance' | 'resolved'

function AlertsPage() {
  if (isDemoMode()) return <AlertsDemo />
  return <AlertsSupabase />
}

function AlertsSupabase() {
  const auth = useAuth()
  const [tab, setTab] = useState<AlertTab>('active')
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(fetchAlerts(), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextAlerts) => {
        if (mounted) setAlerts(nextAlerts)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile])

  const visibleAlerts = useMemo(() => {
    if (tab === 'resolved') return alerts.filter((alert) => alert.resolved)
    const active = alerts.filter((alert) => !alert.resolved)
    if (tab === 'active') return active
    return active.filter((alert) => alert.severity === tab)
  }, [alerts, tab])

  const counts = useMemo(() => {
    const active = alerts.filter((alert) => !alert.resolved)
    return {
      active: active.length,
      urgent: active.filter((alert) => alert.severity === 'urgent').length,
      problem: active.filter((alert) => alert.severity === 'problem').length,
      vigilance: active.filter((alert) => alert.severity === 'vigilance').length,
      resolved: alerts.filter((alert) => alert.resolved).length,
    }
  }, [alerts])

  async function handleResolve(id: string) {
    setResolvingId(id)
    try {
      await resolveAlert(id)
      setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, resolved: true } : alert)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setResolvingId(null)
    }
  }

  if (auth.loading || loading) return <AlertsSkeleton />

  if (!auth.profile) {
    return (
      <BareAlertsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les alertes."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Alertes" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les alertes"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Alertes"
      subtitle="Eleves sans stage, visites en retard, documents manquants, surcharge - donnees Supabase"
    >
      <AlertTabs tab={tab} setTab={setTab} counts={counts} />
      <Card>
        <CardHeader>
          <CardTitle icon={<Bell className="w-4 h-4" />}>Alertes</CardTitle>
        </CardHeader>
        <CardBody>
          {visibleAlerts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-5 h-5" />}
              title={tab === 'resolved' ? 'Aucune alerte resolue' : 'Aucune alerte active'}
              description="Tout est sous controle. Les alertes apparaitront ici quand un eleve, une visite ou un document demandera une action."
            />
          ) : (
            <SupabaseAlertList
              alerts={visibleAlerts}
              resolvingId={resolvingId}
              onResolve={handleResolve}
            />
          )}
        </CardBody>
      </Card>

      <AiDetectionInfo />
    </AppLayout>
  )
}

function AlertsDemo() {
  const groups: Array<{ title: string; severity: 'urgent' | 'problem' | 'vigilance' }> = [
    { title: 'Urgent', severity: 'urgent' },
    { title: 'A traiter', severity: 'problem' },
    { title: 'Vigilance', severity: 'vigilance' },
  ]

  return (
    <AppLayout
      title="Alertes"
      subtitle="Eleves sans stage, visites en retard, documents manquants, surcharge - mode demo"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const items = allAlerts.filter((alert) => alert.severity === group.severity)
          return (
            <Card key={group.severity}>
              <CardHeader>
                <CardTitle icon={<Bell className="w-4 h-4" />}>
                  {group.title} - {items.length}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <AlertList alerts={items} compact emptyMessage="Aucune alerte." />
              </CardBody>
            </Card>
          )
        })}
      </div>

      <AiDetectionInfo />
    </AppLayout>
  )
}

function AlertTabs({
  tab,
  setTab,
  counts,
}: {
  tab: AlertTab
  setTab: (tab: AlertTab) => void
  counts: Record<AlertTab, number>
}) {
  const tabs: Array<{ id: AlertTab; label: string }> = [
    { id: 'active', label: 'Actives' },
    { id: 'urgent', label: 'Urgences' },
    { id: 'problem', label: 'Problemes' },
    { id: 'vigilance', label: 'Vigilance' },
    { id: 'resolved', label: 'Resolues' },
  ]
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setTab(item.id)}
          className={`h-8 px-3 rounded-full text-xs font-medium border ${
            tab === item.id
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]'
              : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-muted)]'
          }`}
        >
          {item.label} ({counts[item.id]})
        </button>
      ))}
    </div>
  )
}

function SupabaseAlertList({
  alerts,
  resolvingId,
  onResolve,
}: {
  alerts: AlertRow[]
  resolvingId: string | null
  onResolve: (id: string) => void
}) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {alerts.map((alert) => (
        <li key={alert.id} className="py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <AlertLevelBadge level={alert.severity} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">{alert.message}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {alert.type} - {formatDate(alert.created_at)}
              </p>
            </div>
            {alert.related_entity_id && <RelatedLink alert={alert} />}
            {!alert.resolved && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onResolve(alert.id)}
                disabled={resolvingId === alert.id}
              >
                Resoudre
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function RelatedLink({ alert }: { alert: AlertRow }) {
  const id = alert.related_entity_id
  if (!id) return null
  const cls = 'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--color-muted)]'
  if (alert.related_entity_type === 'student') {
    return (
      <Link to="/students/$id" params={{ id }} className={cls}>
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    )
  }
  if (alert.related_entity_type === 'company') {
    return (
      <Link to="/companies/$id" params={{ id }} className={cls}>
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    )
  }
  return <ArrowUpRight className="w-4 h-4 text-[var(--color-text-subtle)] mt-1" />
}

function AiDetectionInfo() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle icon={<Sparkles className="w-4 h-4" />}>Detection IA - bientot</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Le moteur IA detectera des signaux faibles : eleves en repli, tuteurs peu reactifs,
          classes en retard, anomalies de saisie, etablissements clients en perte d'activite.
          Toute alerte IA sera doublee d'une explication et d'une action recommandee.
          Validation humaine obligatoire avant diffusion ou message externe.
        </p>
      </CardBody>
    </Card>
  )
}

function AlertsSkeleton() {
  return (
    <AppLayout title="Alertes" subtitle="Lecture des donnees Supabase...">
      <div className="h-72 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
    </AppLayout>
  )
}

function BareAlertsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Bell className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
