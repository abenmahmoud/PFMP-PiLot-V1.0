import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileDown, FileText, PenLine, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { RequestSignaturesModal } from '@/components/signatures/RequestSignaturesModal'
import { SignatureStatusTimeline } from '@/components/signatures/SignatureStatusTimeline'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import type { DocumentSignatureRow, GeneratedDocumentRow } from '@/lib/database.types'
import {
  getDocumentSignatureWorkspace,
  sendReminderForSignature,
  signDocumentAsAuthenticatedUser,
  type DocumentSignatureWorkspace,
  type SignatureStatusResult,
} from '@/server/signatures.functions'
import { downloadFinalSignedPdf, downloadPaperBackupPdf, generateConventionPdf, sendConventionForSignatures } from '@/server/conventions.functions'

export const Route = createFileRoute('/admin/documents/$id')({
  component: AdminDocumentDetailPage,
})

function AdminDocumentDetailPage() {
  if (isDemoMode()) return <AdminDocumentDetailDemo />
  return <AdminDocumentDetailSupabase />
}

function AdminDocumentDetailSupabase() {
  const { id } = Route.useParams()
  const auth = useAuth()
  const [workspace, setWorkspace] = useState<DocumentSignatureWorkspace | null>(null)
  const [modalDocumentId, setModalDocumentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const nextWorkspace = await getDocumentSignatureWorkspace({
      data: { accessToken, establishmentId: auth.activeEstablishmentId, documentId: id },
    })
    setWorkspace(nextWorkspace)
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

  async function handleSigned(_: SignatureStatusResult) {
    await reload()
  }

  async function signAsMe(generatedDocumentId: string) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      await signDocumentAsAuthenticatedUser({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          generatedDocumentId,
          method: 'click_to_sign',
          signatureData: null,
        },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function generateConvention() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await generateConventionPdf({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, documentId: id },
      })
      setActionMessage(`PDF convention genere (version ${result.version}).`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function sendConventionSignatures() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await sendConventionForSignatures({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, documentId: id },
      })
      setActionMessage(`${result.signaturesSent} demande(s) de signature envoyee(s).`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function downloadPaperBackup() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      const result = await downloadPaperBackupPdf({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, documentId: id },
      })
      downloadBase64Pdf(result.pdfBase64, result.filename)
      setActionMessage('PDF papier de secours telecharge.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function downloadSignedFinal() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      const result = await downloadFinalSignedPdf({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, documentId: id },
      })
      downloadBase64Pdf(result.pdfBase64, result.filename)
      setActionMessage('PDF signe final telecharge.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function remind(generatedDocumentId: string, signerEmail: string) {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      await sendReminderForSignature({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, generatedDocumentId, signerEmail },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Document" subtitle="Lecture des signatures...">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error && !workspace) {
    return (
      <AppLayout title="Document" subtitle="Signatures">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger le document" description={error} />
      </AppLayout>
    )
  }

  if (!workspace) {
    return (
      <AppLayout title="Document" subtitle="Signatures">
        <EmptyState icon={<FileText className="w-5 h-5" />} title="Document indisponible" description="Connectez-vous pour consulter les signatures." />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={workspace.logicalDocument.name}
      subtitle="Attestation, generation PDF et signatures simples"
      actions={
        <Link to="/admin/documents">
          <Button type="button" size="sm" variant="secondary">Retour documents</Button>
        </Link>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {actionMessage && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{actionMessage}</div>}

        <Card>
          <CardHeader>
            <CardTitle icon={<FileText className="w-4 h-4" />}>Document source</CardTitle>
            <Badge tone="neutral">{workspace.logicalDocument.type}</Badge>
          </CardHeader>
          <CardBody className="grid gap-3 text-sm md:grid-cols-3">
            <Info label="Statut" value={workspace.logicalDocument.status} />
            <Info label="Cree le" value={formatDateTime(workspace.logicalDocument.created_at)} />
            <Info label="Fichier source" value={workspace.logicalDocument.storage_path ?? 'Non stocke'} />
          </CardBody>
        </Card>

        {workspace.logicalDocument.type === 'convention' && (
          <ConventionWorkflowCard
            status={workspace.logicalDocument.status}
            hasGeneratedDocument={workspace.generatedDocuments.length > 0}
            latestGeneratedDocument={workspace.generatedDocuments[0]?.document ?? null}
            saving={saving}
            onGenerate={generateConvention}
            onSend={sendConventionSignatures}
            onDownloadPaper={downloadPaperBackup}
            onDownloadFinal={downloadSignedFinal}
          />
        )}

        {workspace.generatedDocuments.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title={workspace.logicalDocument.type === 'convention' ? 'PDF convention non genere' : 'Aucune generation PDF'}
            description={
              workspace.logicalDocument.type === 'convention'
                ? 'Utilisez le workflow convention ci-dessus des que le dossier PFMP contient entreprise, tuteur et dates.'
                : 'Generez d abord une attestation depuis le module documents avant de demander les signatures.'
            }
          />
        ) : (
          workspace.generatedDocuments.map(({ document, signatures }) => (
            <GeneratedDocumentCard
              key={document.id}
              document={document}
              signatures={signatures}
              saving={saving}
              showManualSignatureRequest={workspace.logicalDocument.type !== 'convention'}
              onRequest={() => setModalDocumentId(document.id)}
              onSignMe={() => signAsMe(document.id)}
              onRemind={(email) => remind(document.id, email)}
            />
          ))
        )}
      </div>

      {modalDocumentId && (
        <RequestSignaturesModal
          generatedDocumentId={modalDocumentId}
          onClose={() => setModalDocumentId(null)}
          onRequested={handleSigned}
        />
      )}
    </AppLayout>
  )
}

function AdminDocumentDetailDemo() {
  return (
    <AppLayout title="Document" subtitle="Mode demo - signatures factices">
      <Card>
        <CardHeader>
          <CardTitle icon={<PenLine className="w-4 h-4" />}>Circuit de signature demo</CardTitle>
          <Badge tone="warning">Partiel</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            En mode demo, aucun email n'est envoye et aucune signature n'est ecrite en base.
          </p>
          <SignatureStatusTimeline
            signatures={[
              demoSignature('sig_demo_1', 'Tuteur Demo', 'tutor', 'signed'),
              demoSignature('sig_demo_2', 'Referent Demo', 'referent', 'signed'),
              demoSignature('sig_demo_3', 'Administration Demo', 'admin', 'sent'),
            ]}
          />
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function ConventionWorkflowCard({
  status,
  hasGeneratedDocument,
  latestGeneratedDocument,
  saving,
  onGenerate,
  onSend,
  onDownloadPaper,
  onDownloadFinal,
}: {
  status: string
  hasGeneratedDocument: boolean
  latestGeneratedDocument: GeneratedDocumentRow | null
  saving: boolean
  onGenerate: () => void
  onSend: () => void
  onDownloadPaper: () => void
  onDownloadFinal: () => void
}) {
  const canGenerate = status === 'draft' || status === 'generated'
  const canSend = status === 'generated' && hasGeneratedDocument && latestGeneratedDocument?.signature_status === 'not_required'
  const isPending = status === 'pending_signatures'
  const isSigned = status === 'signed'
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FileText className="w-4 h-4" />}>Workflow convention PFMP</CardTitle>
        <Badge tone={isSigned ? 'success' : isPending ? 'warning' : canGenerate ? 'info' : 'neutral'}>
          {conventionWorkflowLabel(status)}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {status !== 'missing' && (
          <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
            <p className="text-sm font-medium text-[var(--color-text)]">Telechargements</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Gardez toujours une sortie papier utilisable en secours, puis le PDF final avec preuves quand toutes les signatures sont collectees.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" iconLeft={<FileDown className="w-4 h-4" />} onClick={onDownloadPaper} disabled={saving}>
                PDF papier de secours
              </Button>
              {isSigned && (
                <Button type="button" size="sm" iconLeft={<ShieldCheck className="w-4 h-4" />} onClick={onDownloadFinal} disabled={saving}>
                  PDF signe final
                </Button>
              )}
            </div>
          </div>
        )}
        {status === 'missing' && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Affectez d'abord une entreprise, un tuteur et les dates dans le dossier PFMP. La convention passera alors en brouillon.
          </p>
        )}
        {canGenerate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" iconLeft={<FileText className="w-4 h-4" />} onClick={onGenerate} disabled={saving}>
              {hasGeneratedDocument ? 'Regenerer le PDF' : 'Generer le PDF'}
            </Button>
            <p className="text-xs text-[var(--color-text-muted)]">
              Le PDF est genere depuis le modele affecte a la classe de l'eleve.
            </p>
          </div>
        )}
        {canSend && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
            <p className="text-sm font-medium text-[var(--color-text)]">Pret pour signature numerique</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Le tuteur entreprise, le responsable legal si l'eleve est mineur, puis le DDFPT recevront un lien de signature.
            </p>
            <Button type="button" size="sm" className="mt-3" iconLeft={<Send className="w-4 h-4" />} onClick={onSend} disabled={saving}>
              Envoyer pour signatures
            </Button>
          </div>
        )}
        {isPending && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Les signatures sont en cours. Les relances sont disponibles dans la carte de version PDF ci-dessous.
          </p>
        )}
        {isSigned && (
          <p className="text-sm text-green-700">
            Convention completement signee. Le PDF final avec page de preuve est disponible dans la version ci-dessous.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

function GeneratedDocumentCard({
  document,
  signatures,
  saving,
  showManualSignatureRequest,
  onRequest,
  onSignMe,
  onRemind,
}: {
  document: GeneratedDocumentRow
  signatures: DocumentSignatureRow[]
  saving: boolean
  showManualSignatureRequest: boolean
  onRequest: () => void
  onSignMe: () => void
  onRemind: (email: string) => void
}) {
  const pending = signatures.filter((signature) => signature.status !== 'signed' && signature.status !== 'cancelled' && signature.status !== 'expired')
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<PenLine className="w-4 h-4" />}>Version generee #{document.version}</CardTitle>
        <Badge tone={document.signature_status === 'fully_signed' ? 'success' : document.signature_status === 'not_required' ? 'neutral' : 'warning'}>
          {workflowLabel(document.signature_status)}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <Info label="Genere le" value={formatDateTime(document.generated_at)} />
          <Info label="Hash PDF" value={document.sha256_hex ?? 'Non renseigne'} mono />
          <Info label="Hash final" value={document.final_signed_sha256_hex ?? 'Non finalise'} mono />
        </div>
        <SignatureStatusTimeline signatures={signatures} />
        <div className="flex flex-wrap gap-2">
          {showManualSignatureRequest && (
            <Button type="button" size="sm" iconLeft={<Send className="w-4 h-4" />} onClick={onRequest} disabled={saving || document.signature_status === 'fully_signed'}>
              Demander signatures
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" iconLeft={<CheckCircle2 className="w-4 h-4" />} onClick={onSignMe} disabled={saving || document.signature_status === 'fully_signed'}>
            Signer avec mon compte
          </Button>
          {pending.map((signature) => (
            <Button key={signature.id} type="button" size="sm" variant="ghost" iconLeft={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => onRemind(signature.signer_email)} disabled={saving}>
              Relancer {signature.signer_name ?? signature.signer_email}
            </Button>
          ))}
          <Link to="/verify/$documentId" params={{ documentId: document.id }} className="inline-flex h-8 items-center rounded-md bg-[var(--color-brand-50)] px-3 text-xs font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)]">
            Verifier
          </Link>
        </div>
      </CardBody>
    </Card>
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

function workflowLabel(status: GeneratedDocumentRow['signature_status']): string {
  const labels: Record<GeneratedDocumentRow['signature_status'], string> = {
    not_required: 'Non requis',
    pending_signatures: 'En attente',
    partial_signed: 'Partiel',
    fully_signed: 'Signe complet',
  }
  return labels[status]
}

function conventionWorkflowLabel(status: string): string {
  const labels: Record<string, string> = {
    missing: 'A completer',
    draft: 'Brouillon pret',
    generated: 'PDF genere',
    pending_signatures: 'Signatures en cours',
    signed: 'Signe',
    validated: 'Valide',
    archived: 'Archive',
  }
  return labels[status] ?? status
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function downloadBase64Pdf(base64: string, filename: string): void {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function demoSignature(
  id: string,
  name: string,
  role: DocumentSignatureRow['signer_role'],
  status: DocumentSignatureRow['status'],
): DocumentSignatureRow {
  const now = new Date().toISOString()
  return {
    id,
    establishment_id: 'demo',
    document_id: 'demo',
    generated_document_id: 'demo',
    signer_email: `${id}@example.com`,
    signer_name: name,
    signer_role: role,
    signer_user_id: null,
    signer_tutor_id: null,
    signer_student_id: null,
    signer_phone: null,
    status,
    sent_at: now,
    viewed_at: status === 'signed' ? now : null,
    signed_at: status === 'signed' ? now : null,
    refused_at: null,
    refusal_reason: null,
    signature_data: null,
    signature_method: status === 'signed' ? 'click_to_sign' : null,
    signature_image_url: null,
    signed_document_sha256: status === 'signed' ? 'demo-hash' : null,
    document_hash: 'demo-hash',
    ip_address: null,
    user_agent: null,
    signed_from_ip: null,
    signed_from_user_agent: null,
    geolocation: null,
    magic_link_token_hash: null,
    magic_link_expires_at: null,
    magic_link_used_at: null,
    otp_code_hash: null,
    otp_verified_at: null,
    signing_order: 1,
    created_at: now,
    updated_at: now,
  }
}
