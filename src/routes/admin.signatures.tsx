import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileSignature, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { listSignatureDashboard, type SignatureDashboardItem } from '@/server/signatures.functions'

export const Route = createFileRoute('/admin/signatures')({
  component: AdminSignaturesPage,
})

function AdminSignaturesPage() {
  if (isDemoMode()) return <AdminSignaturesDemo />
  return <AdminSignaturesSupabase />
}

function AdminSignaturesSupabase() {
  const auth = useAuth()
  const [items, setItems] = useState<SignatureDashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const nextItems = await listSignatureDashboard({ data: { accessToken, establishmentId: auth.activeEstablishmentId } })
    setItems(nextItems)
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

  const stats = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((item) => item.document.signature_status === 'pending_signatures' || item.document.signature_status === 'partial_signed').length,
      fully: items.filter((item) => item.document.signature_status === 'fully_signed').length,
    }
  }, [items])

  if (auth.loading || loading) {
    return (
      <AppLayout title="Signatures" subtitle="Lecture des demandes...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error && items.length === 0) {
    return (
      <AppLayout title="Signatures" subtitle="Documents PFMP">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger les signatures" description={error} />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Signatures"
      subtitle={`${stats.total} document(s) avec circuit signature`}
      actions={
        <Button type="button" size="sm" variant="secondary" iconLeft={<RefreshCw className="w-4 h-4" />} onClick={() => reload()}>
          Actualiser
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="En cours" value={stats.pending} tone="warning" />
        <MetricCard label="Finalises" value={stats.fully} tone="success" />
        <MetricCard label="Total" value={stats.total} tone="neutral" />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle icon={<FileSignature className="w-4 h-4" />}>Demandes de signature</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {items.length === 0 ? (
            <EmptyState title="Aucune signature" description="Les documents apparaitront ici apres une demande de signature." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((item) => {
                const signed = item.signatures.filter((signature) => signature.status === 'signed').length
                return (
                  <li key={item.document.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.logicalDocument?.name ?? 'Document PFMP'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {signed}/{item.signatures.length} signature(s) - genere le {formatDate(item.document.generated_at)}
                      </p>
                    </div>
                    <Badge tone={item.document.signature_status === 'fully_signed' ? 'success' : 'warning'}>
                      {workflowLabel(item.document.signature_status)}
                    </Badge>
                    {item.logicalDocument && (
                      <Link to="/admin/documents/$id" params={{ id: item.logicalDocument.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
                        Ouvrir
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function AdminSignaturesDemo() {
  const items = [
    { name: 'Attestation PFMP - Lina Martin', signed: 2, total: 3, status: 'Partiel' },
    { name: 'Attestation PFMP - Yanis Bernard', signed: 3, total: 3, status: 'Finalise' },
  ]
  return (
    <AppLayout title="Signatures" subtitle="Mode demo - aucune signature reelle envoyee">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="En cours" value={1} tone="warning" />
        <MetricCard label="Finalises" value={1} tone="success" />
        <MetricCard label="Total" value={2} tone="neutral" />
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle icon={<FileSignature className="w-4 h-4" />}>Demandes de signature demo</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((item) => (
              <li key={item.name} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{item.signed}/{item.total} signature(s)</p>
                </div>
                <Badge tone={item.status === 'Finalise' ? 'success' : 'warning'}>{item.status}</Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'success' | 'neutral' }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{value}</p>
          <Badge tone={tone}>{label}</Badge>
        </div>
      </CardBody>
    </Card>
  )
}

function workflowLabel(status: SignatureDashboardItem['document']['signature_status']): string {
  const labels: Record<SignatureDashboardItem['document']['signature_status'], string> = {
    not_required: 'Non requis',
    pending_signatures: 'En attente',
    partial_signed: 'Partiel',
    fully_signed: 'Finalise',
  }
  return labels[status]
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}
