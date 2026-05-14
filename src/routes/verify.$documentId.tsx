import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, FileCheck2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { QrCodeVerify } from '@/components/signatures/QrCodeVerify'
import { isDemoMode } from '@/lib/supabase'
import { getPublicDocumentVerification, type PublicDocumentVerification } from '@/server/signatures.functions'

export const Route = createFileRoute('/verify/$documentId')({
  component: VerifyDocumentPage,
})

function VerifyDocumentPage() {
  if (isDemoMode()) return <VerifyDocumentDemo />
  return <VerifyDocumentSupabase />
}

function VerifyDocumentSupabase() {
  const { documentId } = Route.useParams()
  const [verification, setVerification] = useState<PublicDocumentVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getPublicDocumentVerification({ data: { generatedDocumentId: documentId } })
      .then((nextVerification) => {
        if (mounted) setVerification(nextVerification)
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
  }, [documentId])

  const verifyUrl = typeof window === 'undefined' ? `https://www.pfmp-pilot.fr/verify/${documentId}` : window.location.href

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <div>
            <p className="text-lg font-semibold text-[var(--color-text)]">Verification document PFMP</p>
            <p className="text-sm text-[var(--color-text-muted)]">Preuve publique de signature electronique simple.</p>
          </div>
        </div>

        {loading ? (
          <Card><CardBody className="py-10 text-center text-sm text-[var(--color-text-muted)]">Verification en cours...</CardBody></Card>
        ) : error || !verification ? (
          <Card>
            <CardBody className="py-10 text-center">
              <XCircle className="mx-auto mb-3 h-9 w-9 text-red-600" />
              <h1 className="text-lg font-semibold">Document introuvable</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{error ?? 'Aucune preuve publique disponible pour ce document.'}</p>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle icon={verification.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}>
                  {verification.logicalDocument?.name ?? 'Document PFMP'}
                </CardTitle>
                <Badge tone={verification.valid ? 'success' : 'warning'}>{verification.valid ? 'Valide' : 'Incomplet'}</Badge>
              </CardHeader>
              <CardBody className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2 text-sm">
                  <Info label="Statut" value={workflowLabel(verification.document.signature_status)} />
                  <Info label="Genere le" value={formatDateTime(verification.document.generated_at)} />
                  <Info label="Hash original" value={verification.document.sha256_hex ?? 'Non renseigne'} mono />
                  <Info label="Hash final preuve" value={verification.document.final_signed_sha256_hex ?? 'Non finalise'} mono />
                </div>
                <div>
                  <QrCodeVerify url={verifyUrl} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signatures</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="divide-y divide-[var(--color-border)]">
                  {verification.signatures.map((signature) => (
                    <li key={signature.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{signature.signer_name ?? 'Signataire'}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {signature.signer_role} - {signature.signed_at ? formatDateTime(signature.signed_at) : 'non signe'}
                        </p>
                      </div>
                      <Badge tone={signature.status === 'signed' ? 'success' : 'warning'}>{signature.status}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}

function VerifyDocumentDemo() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle icon={<CheckCircle2 className="w-4 h-4" />}>Document demo verifie</CardTitle>
            <Badge tone="success">Valide demo</Badge>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Mode demo : cette page simule une preuve publique sans interroger Supabase.</p>
            <Info label="Hash final preuve" value="demo-sha256-proof" mono />
          </CardBody>
        </Card>
      </div>
    </main>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className={mono ? 'break-all font-mono text-xs text-[var(--color-text)]' : 'text-[var(--color-text)]'}>{value}</p>
    </div>
  )
}

function workflowLabel(status: PublicDocumentVerification['document']['signature_status']): string {
  const labels: Record<PublicDocumentVerification['document']['signature_status'], string> = {
    not_required: 'Signature non requise',
    pending_signatures: 'En attente',
    partial_signed: 'Partiellement signe',
    fully_signed: 'Completement signe',
  }
  return labels[status]
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
