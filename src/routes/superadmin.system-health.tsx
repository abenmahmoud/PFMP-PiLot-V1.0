import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, Database, RefreshCw } from 'lucide-react'
import { ComplianceChecks } from '@/components/superadmin/ComplianceChecks'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { getSystemHealth, type SystemHealth } from '@/server/superadminDashboard.functions'
import { auditTenantLinkages, type TenantLinkageAuditResult } from '@/server/tenantReference.functions'

export const Route = createFileRoute('/superadmin/system-health')({
  component: SuperadminSystemHealthPage,
})

function SuperadminSystemHealthPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Sante systeme" subtitle="Mode demo">
        <EmptyState title="Sante systeme demo" description="Les checks techniques reels dependent de Supabase." />
      </AppLayout>
    )
  }
  return <SystemHealthSupabase />
}

function SystemHealthSupabase() {
  const auth = useAuth()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [linkageAudit, setLinkageAudit] = useState<TenantLinkageAuditResult | null>(null)
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
      const [nextHealth, nextAudit] = await Promise.all([
        getSystemHealth({ data: { accessToken } }),
        auth.activeEstablishmentId
          ? auditTenantLinkages({ data: { accessToken, establishmentId: auth.activeEstablishmentId } })
          : Promise.resolve(null),
      ])
      setHealth(nextHealth)
      setLinkageAudit(nextAudit)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.loading) return
    load()
  }, [auth.loading, auth.session?.access_token, auth.activeEstablishmentId])

  if (auth.loading || loading) {
    return (
      <AppLayout title="Sante systeme" subtitle="Monitoring superadmin">
        <EmptyState title="Chargement sante systeme" description="Controle des tables et checks." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Sante systeme" subtitle="Monitoring superadmin">
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
      <AppLayout title="Sante systeme" subtitle="Monitoring superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Acces reserve aux superadmins"
          description="Cette page est limitee a la console superadmin."
        />
      </AppLayout>
    )
  }

  if (error || !health) {
    return (
      <AppLayout title="Sante systeme" subtitle="Monitoring superadmin">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Sante systeme indisponible"
          description={error ?? 'Aucun resultat.'}
          action={<Button onClick={load}>Reessayer</Button>}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Sante systeme"
      subtitle={`Snapshot ${new Date(health.generated_at).toLocaleString('fr-FR')} · cache ${health.cache_ttl_seconds}s`}
      actions={
        <Button size="sm" iconLeft={<RefreshCw className="h-4 w-4" />} onClick={load} disabled={loading}>
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle icon={<Database className="h-4 w-4" />}>Tables principales</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {health.tables.map((table) => (
                <div key={table.name} className="rounded-lg border border-[var(--color-border)] bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                        {table.name}
                      </p>
                      <p className="mt-2 text-xl font-semibold">{table.rows}</p>
                    </div>
                    <Badge tone={table.status === 'ok' ? 'success' : 'warning'}>{table.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <ComplianceChecks checks={health.checks} />
        <LinkageAuditCard audit={linkageAudit} />
      </div>
    </AppLayout>
  )
}

function LinkageAuditCard({ audit }: { audit: TenantLinkageAuditResult | null }) {
  if (!audit) {
    return (
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle icon={<Database className="h-4 w-4" />}>Audit liaisons tenant</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--color-text-muted)]">
            Selectionnez un etablissement actif avec le switcher superadmin pour auditer ses liaisons PFMP.
          </p>
        </CardBody>
      </Card>
    )
  }

  const blockingIssues = audit.issues.filter((issue) => issue.severity === 'error')

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle icon={<Database className="h-4 w-4" />}>Audit liaisons tenant</CardTitle>
        <Badge tone={audit.summary.errors === 0 ? 'success' : 'danger'}>
          {audit.summary.errors === 0 ? 'OK' : `${audit.summary.errors} erreurs`}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <AuditMetric label="Eleves" value={audit.summary.students} />
          <AuditMetric label="Periodes" value={audit.summary.periods} />
          <AuditMetric label="Placements" value={audit.summary.placements} />
          <AuditMetric label="Warnings" value={audit.summary.warnings} />
        </div>
        {audit.issues.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Toutes les liaisons principales sont coherentes : classes, eleves, periodes, placements, entreprises, tuteurs et referents.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {(blockingIssues.length > 0 ? blockingIssues : audit.issues).slice(0, 8).map((issue, index) => (
              <li key={`${issue.entity}-${issue.entityId}-${issue.relation}-${index}`} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={issue.severity === 'error' ? 'danger' : 'warning'}>{issue.severity}</Badge>
                  <span className="font-medium">{issue.relation}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{issue.entityId ?? '-'}</span>
                </div>
                <p className="mt-1 text-[var(--color-text-muted)]">{issue.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function AuditMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-muted)]/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
