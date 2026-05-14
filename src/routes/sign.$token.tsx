import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, FileSignature, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { SignatureCanvas } from '@/components/signatures/SignatureCanvas'
import { RgpdConsentModal } from '@/components/legal/RgpdConsentModal'
import { isDemoMode } from '@/lib/supabase'
import {
  getSignatureRequestByToken,
  signDocumentViaMagicLink,
  type PublicSignatureRequest,
  type PublicSignatureSubmitResult,
} from '@/server/signatures.functions'
import type { SignatureMethod } from '@/lib/database.types'

export const Route = createFileRoute('/sign/$token')({
  component: PublicSignaturePage,
})

function PublicSignaturePage() {
  if (isDemoMode()) return <PublicSignatureDemo />
  return <PublicSignatureSupabase />
}

function PublicSignatureSupabase() {
  const { token } = Route.useParams()
  const [request, setRequest] = useState<PublicSignatureRequest | null>(null)
  const [result, setResult] = useState<PublicSignatureSubmitResult | null>(null)
  const [method, setMethod] = useState<SignatureMethod>('click_to_sign')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showConsent, setShowConsent] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getSignatureRequestByToken({ data: { token } })
      .then((nextRequest) => {
        if (!mounted) return
        if (!nextRequest) {
          setError('Lien de signature invalide, expire ou deja utilise.')
          return
        }
        setRequest(nextRequest)
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
  }, [token])

  async function sign() {
    if (!consentAccepted) {
      setShowConsent(true)
      return
    }
    if (method === 'draw_signature' && !signatureData) {
      setError('Dessinez votre signature avant de valider.')
      return
    }
    setSigning(true)
    setError(null)
    try {
      const nextResult = await signDocumentViaMagicLink({
        data: {
          token,
          method,
          signatureData: method === 'draw_signature' ? signatureData : null,
          ip: null,
          userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
        },
      })
      setResult(nextResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSigning(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff7ed,#eef2ff)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-white">
            <FileSignature className="w-5 h-5" />
          </span>
          <div>
            <p className="text-lg font-semibold text-slate-950">PFMP Pilot AI</p>
            <p className="text-sm text-slate-600">Signature electronique simple</p>
          </div>
        </div>

        {loading ? (
          <Card><CardBody className="py-10 text-center text-sm text-[var(--color-text-muted)]">Verification du lien...</CardBody></Card>
        ) : error && !request ? (
          <Card>
            <CardBody className="py-10">
              <div className="mx-auto max-w-md text-center">
                <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-red-600" />
                <h1 className="text-lg font-semibold">Lien indisponible</h1>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{error}</p>
              </div>
            </CardBody>
          </Card>
        ) : result ? (
          <Card>
            <CardBody className="py-10">
              <div className="mx-auto max-w-md text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                <h1 className="text-xl font-semibold">Signature enregistree</h1>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Merci. Votre signature est horodatee et rattachee au hash du document.
                </p>
                <Link to="/verify/$documentId" params={{ documentId: result.generatedDocumentId }} className="mt-4 inline-flex text-sm font-medium text-[var(--color-brand-700)]">
                  Verifier le document
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : request ? (
          <Card>
            <CardHeader>
              <CardTitle icon={<ShieldCheck className="w-4 h-4" />}>Document a signer</CardTitle>
              <Badge tone="warning">En attente</Badge>
            </CardHeader>
            <CardBody className="space-y-5">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
                <p className="text-sm font-medium text-[var(--color-text)]">{request.logicalDocument?.name ?? 'Document PFMP'}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Signataire : {request.signature.signer_name ?? request.signature.signer_email} - expiration {formatDate(request.expiresAt)}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--color-text-muted)]">Hash document : {request.document.sha256_hex ?? request.signature.document_hash ?? 'calcule a la signature'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethod('click_to_sign')}
                  className={`rounded-lg border p-3 text-left text-sm ${method === 'click_to_sign' ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)] bg-white'}`}
                >
                  <span className="font-medium">Click-to-sign</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Je confirme signer ce document.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('draw_signature')}
                  className={`rounded-lg border p-3 text-left text-sm ${method === 'draw_signature' ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)] bg-white'}`}
                >
                  <span className="font-medium">Signature dessinee</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Dessiner une signature manuscrite simple.</span>
                </button>
              </div>

              {method === 'draw_signature' && <SignatureCanvas value={signatureData} onChange={setSignatureData} />}

              <label className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <input type="checkbox" className="mt-1" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
                <span>J'accepte les mentions RGPD et je comprends qu'il s'agit d'une signature electronique simple.</span>
              </label>

              <Button type="button" size="lg" className="w-full" onClick={sign} disabled={signing}>
                {signing ? 'Signature...' : 'Je signe ce document'}
              </Button>
            </CardBody>
          </Card>
        ) : null}
      </div>
      {showConsent && (
        <RgpdConsentModal
          onAccept={() => {
            setConsentAccepted(true)
            setShowConsent(false)
          }}
          onClose={() => setShowConsent(false)}
        />
      )}
    </main>
  )
}

function PublicSignatureDemo() {
  const [signed, setSigned] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff7ed,#eef2ff)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle icon={<FileSignature className="w-4 h-4" />}>Signature demo</CardTitle>
            <Badge tone={signed ? 'success' : 'warning'}>{signed ? 'Signe' : 'Demo'}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Mode demo : aucune preuve reelle n'est stockee et aucun email n'est envoye.
            </p>
            {signed ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Signature demo enregistree localement.
              </div>
            ) : (
              <>
                <label className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                  <input type="checkbox" className="mt-1" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
                  <span>J'accepte les mentions RGPD demo.</span>
                </label>
                <Button
                  type="button"
                  onClick={() => {
                    if (!consentAccepted) {
                      setShowConsent(true)
                      return
                    }
                    setSigned(true)
                  }}
                >
                  Je signe en demo
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
      {showConsent && (
        <RgpdConsentModal
          onAccept={() => {
            setConsentAccepted(true)
            setShowConsent(false)
          }}
          onClose={() => setShowConsent(false)}
        />
      )}
    </main>
  )
}

function formatDate(value: string): string {
  if (!value) return 'non definie'
  return new Date(value).toLocaleDateString('fr-FR')
}
