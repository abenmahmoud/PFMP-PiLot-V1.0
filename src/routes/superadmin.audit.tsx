import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, Download, Search } from 'lucide-react'
import { ActivityFeedItem } from '@/components/superadmin/ActivityFeedItem'
import { EmptyState } from '@/components/EmptyState'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  getActivityFeed,
  getEstablishmentBreakdown,
  type EnrichedAuditLog,
  type EstablishmentBreakdownItem,
} from '@/server/superadminDashboard.functions'

export const Route = createFileRoute('/superadmin/audit')({
  component: SuperadminAuditPage,
})

function SuperadminAuditPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Audit cross-tenant" subtitle="Mode demo">
        <EmptyState title="Audit demo" description="Le flux d'audit reel depend de Supabase." />
      </AppLayout>
    )
  }
  return <AuditSupabase />
}

function AuditSupabase() {
  const auth = useAuth()
  const [logs, setLogs] = useState<EnrichedAuditLog[]>([])
  const [establishments, setEstablishments] = useState<EstablishmentBreakdownItem[]>([])
  const [query, setQuery] = useState('')
  const [establishmentId, setEstablishmentId] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const accessToken = auth.session?.access_token
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [nextLogs, nextEstablishments] = await Promise.all([
        getActivityFeed({
          data: {
            accessToken,
            limit: 200,
            establishmentId: establishmentId || null,
            action: action || null,
          },
        }),
        getEstablishmentBreakdown({ data: { accessToken } }),
      ])
      setLogs(nextLogs)
      setEstablishments(nextEstablishments)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.loading) return
    load()
  }, [auth.loading, auth.session?.access_token, establishmentId, action])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log) =>
      [
        log.action,
        log.description ?? '',
        log.establishment_name ?? '',
        log.user_name ?? '',
      ].some((value) => value.toLowerCase().includes(q)),
    )
  }, [logs, query])

  function exportCsv() {
    const header = ['date', 'etablissement', 'user', 'action', 'description']
    const rows = filtered.map((log) => [
      log.created_at,
      log.establishment_name ?? '',
      log.user_name ?? '',
      log.action,
      log.description ?? '',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pfmp-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Audit cross-tenant" subtitle="Journal superadmin">
        <EmptyState title="Chargement audit" description="Lecture des derniers audit logs." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Audit cross-tenant" subtitle="Journal superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Session requise"
          description="Connectez-vous avec un compte superadmin."
          action={
            <Link to="/admin/login">
              <Button>Connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.profile.role !== 'superadmin') {
    return (
      <AppLayout title="Audit cross-tenant" subtitle="Journal superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Acces reserve aux superadmins"
          description="Cette vue affiche le journal cross-tenant."
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Audit cross-tenant" subtitle="Journal superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Audit indisponible"
          description={error}
          action={<Button onClick={load}>Reessayer</Button>}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Audit cross-tenant"
      subtitle="Filtrage CNIL/RGPD des actions sensibles"
      actions={
        <Button size="sm" variant="secondary" iconLeft={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Export CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle icon={<Search className="h-4 w-4" />}>Filtres</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 lg:grid-cols-[1fr_240px_220px]">
            <SearchFilterBar query={query} onQueryChange={setQuery} placeholder="Recherche action, utilisateur..." />
            <select
              className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
              value={establishmentId}
              onChange={(event) => setEstablishmentId(event.target.value)}
            >
              <option value="">Tous les etablissements</option>
              {establishments.map((item) => (
                <option key={item.establishment.id} value={item.establishment.id}>
                  {item.establishment.name}
                </option>
              ))}
            </select>
            <input
              className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Filtrer action"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernieres actions</CardTitle>
            <span className="text-xs text-[var(--color-text-muted)]">{filtered.length} log(s)</span>
          </CardHeader>
          <CardBody>
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Aucun audit log pour ces filtres.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {filtered.map((item) => (
                  <ActivityFeedItem key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
