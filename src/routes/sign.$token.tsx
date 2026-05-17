import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, FileSignature, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react'
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
import { requestSignatureOtp, verifySignatureOtp } from '@/server/signatureOtp.functions'
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
  const [step, setStep] = useState<'read' | 'otp' | 'sign'>('read')
  const [readSeconds, setReadSeconds] = useState(0)
  const [readScrolled, setReadScrolled] = useState(false)
  const [phoneRaw, setPhoneRaw] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)
  const [otpVerified, setOtpVerified] = useState(false)
  const [handwrittenMention, setHandwrittenMention] = useState('')
  const [method, setMethod] = useState<SignatureMethod>('click_to_sign')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showConsent, setShowConsent] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsOtp = request?.signature.assurance_level === 'advanced'
  const canLeaveReadStep = readSeconds >= 10 && readScrolled
  const canSign = useMemo(() => {
    if (!request) return false
    if (!consentAccepted) return false
    if (method === 'draw_signature' && !signatureData) return false
    if (needsOtp && (!otpVerified || handwrittenMention !== 'Lu et approuvé')) return false
    return true
  }, [consentAccepted, handwrittenMention, method, needsOtp, otpVerified, request, signatureData])

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

  useEffect(() => {
    if (!request || step !== 'read' || readSeconds >= 10) return
    const timer = window.setInterval(() => setReadSeconds((value) => Math.min(10, value + 1)), 1000)
    return () => window.clearInterval(timer)
  }, [readSeconds, request, step])

  function confirmRead() {
    if (!canLeaveReadStep) return
    setError(null)
    setStep(needsOtp ? 'otp' : 'sign')
  }

  async function sendOtp() {
    setSigning(true)
    setError(null)
    try {
      const response = await requestSignatureOtp({ data: { token, phone_raw: phoneRaw } })
      setOtpChallengeId(response.challenge_id)
      setMaskedPhone(response.masked_phone)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSigning(false)
    }
  }

  async function verifyOtpCode() {
    if (!otpChallengeId) {
      setError('Demandez d abord un code SMS.')
      return
    }
    setSigning(true)
    setError(null)
    try {
      const response = await verifySignatureOtp({ data: { token, challenge_id: otpChallengeId, code: otpCode } })
      if (response.verified) {
        setOtpVerified(true)
        setStep('sign')
        return
      }
      if (response.locked_until) setError(`Trop de tentatives. Reessayez apres ${new Date(response.locked_until).toLocaleTimeString('fr-FR')}.`)
      else setError(`Code incorrect. Il reste ${response.attempts_left ?? 0} tentative(s).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSigning(false)
    }
  }

  async function sign() {
    if (!consentAccepted) {
      setShowConsent(true)
      return
    }
    if (method === 'draw_signature' && !signatureData) {
      setError('Dessinez votre signature avant de valider.')
      return
    }
    if (needsOtp && handwrittenMention !== 'Lu et approuvé') {
      setError('Tapez exactement la mention Lu et approuvé.')
      return
    }
    if (needsOtp && (!otpVerified || !otpChallengeId)) {
      setError('Verification telephone OTP requise avant signature.')
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
          handwritten_mention: handwrittenMention || null,
          otp_challenge_id: otpChallengeId,
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
            <p className="text-sm text-slate-600">Signature electronique avancee PFMP</p>
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
                  Merci. Votre signature a ete enregistree.
                  {result.signatureStatus === 'fully_signed'
                    ? ' La convention est maintenant complete et le PDF signe est disponible.'
                    : ' Le document reste en attente des autres signataires.'}
                </p>
                <Link to="/verify/$documentId" params={{ documentId: result.generatedDocumentId }} className="mt-4 inline-flex text-sm font-medium text-[var(--color-brand-700)]">
                  {result.signatureStatus === 'fully_signed' ? 'Telecharger / verifier le PDF signe' : 'Verifier le document'}
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : request ? (
          <Card>
            <CardHeader>
              <CardTitle icon={<ShieldCheck className="w-4 h-4" />}>Document a signer</CardTitle>
              <Badge tone={needsOtp ? 'brand' : 'warning'}>{needsOtp ? 'Signature avancee' : 'Signature simple'}</Badge>
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

              <StepHeader current={step} needsOtp={Boolean(needsOtp)} />

              {step === 'read' && (
                <div className="space-y-4">
                  <div
                    className="h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-white"
                    onScroll={(event) => {
                      const target = event.currentTarget
                      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 16) setReadScrolled(true)
                    }}
                  >
                    {request.previewUrl ? (
                      <iframe title="Document PFMP a signer" src={request.previewUrl} className="h-[760px] w-full border-0" />
                    ) : (
                      <div className="flex h-[760px] items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
                        Apercu PDF indisponible. Faites defiler jusqu en bas pour confirmer la lecture.
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                      <Clock3 className="h-4 w-4" />
                      Lecture en cours : {readSeconds}/10s · {readScrolled ? 'bas du document atteint' : 'faites defiler jusqu en bas'}
                    </div>
                    <Button type="button" onClick={confirmRead} disabled={!canLeaveReadStep}>
                      J'ai lu la convention
                    </Button>
                  </div>
                </div>
              )}

              {step === 'otp' && (
                <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-[var(--color-brand-700)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">Verification telephone</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Un code a 6 chiffres valide votre identite de signataire.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={phoneRaw}
                      onChange={(event) => setPhoneRaw(event.target.value)}
                      placeholder="06 12 34 56 78"
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                    />
                    <Button type="button" onClick={sendOtp} disabled={signing || !phoneRaw.trim()}>
                      Recevoir le code
                    </Button>
                  </div>
                  {maskedPhone && <p className="text-xs text-green-700">Code envoye au {maskedPhone}.</p>}
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-center font-mono text-lg tracking-[0.35em]"
                    />
                    <Button type="button" onClick={verifyOtpCode} disabled={signing || otpCode.length !== 6}>
                      Verifier
                    </Button>
                  </div>
                </div>
              )}

              {step === 'sign' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      Vous signez en tant que {request.signature.signer_name ?? request.signature.signer_email}.
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Document : {request.logicalDocument?.name ?? 'Convention PFMP'}.
                    </p>
                  </div>

                  {needsOtp && (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[var(--color-text)]">Mention manuscrite obligatoire</span>
                      <input
                        value={handwrittenMention}
                        onChange={(event) => setHandwrittenMention(event.target.value)}
                        onPaste={(event) => event.preventDefault()}
                        placeholder="Lu et approuvé"
                        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                      />
                    </label>
                  )}

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
                      <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Dessiner une signature manuscrite.</span>
                    </button>
                  </div>

                  {method === 'draw_signature' && <SignatureCanvas value={signatureData} onChange={setSignatureData} />}

                  <label className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                    <input type="checkbox" className="mt-1" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
                    <span>Je certifie etre le signataire indique et j'accepte les mentions RGPD de conservation des preuves.</span>
                  </label>

                  <Button type="button" size="lg" className="w-full bg-green-700 hover:bg-green-800" onClick={sign} disabled={signing || !canSign}>
                    {signing ? 'Signature...' : 'Signer maintenant'}
                  </Button>
                </div>
              )}
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

function StepHeader({ current, needsOtp }: { current: 'read' | 'otp' | 'sign'; needsOtp: boolean }) {
  const steps = needsOtp
    ? [
        ['read', 'Lecture'],
        ['otp', 'Telephone'],
        ['sign', 'Signature'],
      ]
    : [
        ['read', 'Lecture'],
        ['sign', 'Signature'],
      ]
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {steps.map(([key, label], index) => (
        <div
          key={key}
          className={`rounded-lg border px-3 py-2 text-sm ${current === key ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]'}`}
        >
          {index + 1}. {label}
        </div>
      ))}
    </div>
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
