import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Download,
  FileText,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Send,
  UserRound,
} from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  getStudentPublicDashboard,
  requestStudentConventionSignature,
  type StudentPublicDashboard,
  type StudentPublicSession,
  updateStudentGuardianContact,
} from '@/server/studentPortal.functions'

const STUDENT_SESSION_KEY = 'pfmp_student_session'

export const Route = createFileRoute('/eleve/dashboard')({ component: StudentDashboardPage })

function StudentDashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<StudentPublicSession | null>(null)
  const [dashboard, setDashboard] = useState<StudentPublicDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedSession = readStudentSession()
    if (!storedSession) {
      navigate({ to: '/eleve' })
      return
    }

    let mounted = true
    setSession(storedSession)
    setLoading(true)
    setError(null)

    getStudentPublicDashboard({ data: { studentId: storedSession.studentId } })
      .then((nextDashboard) => {
        if (mounted) setDashboard(nextDashboard)
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
  }, [navigate])

  function logout() {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(STUDENT_SESSION_KEY)
    navigate({ to: '/eleve' })
  }

  async function refreshDashboard() {
    if (!session) return
    const nextDashboard = await getStudentPublicDashboard({ data: { studentId: session.studentId } })
    setDashboard(nextDashboard)
  }

  if (loading) {
    return (
      <StudentPublicShell title="Chargement..." onLogout={logout}>
        <CenteredState
          title="Lecture de votre suivi PFMP"
          description="Nous recuperons les informations partagees par votre etablissement."
        />
      </StudentPublicShell>
    )
  }

  if (error) {
    return (
      <StudentPublicShell title="Espace eleve" onLogout={logout}>
        <CenteredState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger votre espace"
          description={error}
          action={<Button onClick={logout}>Retour au code</Button>}
        />
      </StudentPublicShell>
    )
  }

  if (!session || !dashboard) {
    return (
      <StudentPublicShell title="Session expiree" onLogout={logout}>
        <CenteredState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session expiree"
          description="Votre code n'est plus actif ou votre session n'est plus valide."
          action={<Button onClick={logout}>Saisir un nouveau code</Button>}
        />
      </StudentPublicShell>
    )
  }

  return (
    <StudentPublicShell
      title={`Bonjour, ${session.firstName} ${session.lastName}`}
      establishmentName={session.establishmentName}
      onLogout={logout}
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <StageCard dashboard={dashboard} onRefresh={refreshDashboard} />
        <StudentInfoCard dashboard={dashboard} session={session} onRefresh={refreshDashboard} />
      </div>
    </StudentPublicShell>
  )
}

function StudentPublicShell({
  title,
  establishmentName,
  onLogout,
  children,
}: {
  title: string
  establishmentName?: string
  onLogout: () => void
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white font-bold">
              P
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">{title}</h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                {establishmentName ?? 'PFMP Pilot AI'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconLeft={<LogOut className="w-3.5 h-3.5" />}
            onClick={onLogout}
          >
            Se deconnecter
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">{children}</section>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-[var(--color-text-muted)]">
        PFMP Pilot AI - Donnees gerees par votre etablissement
      </footer>
    </main>
  )
}

function StageCard({ dashboard, onRefresh }: { dashboard: StudentPublicDashboard; onRefresh: () => Promise<void> }) {
  const placement = dashboard.placement
  const status = placement?.status ?? 'no_stage'

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Building2 className="w-4 h-4" />}>Mon stage</CardTitle>
        <Badge tone={getStageTone(status)}>{getStageLabel(status)}</Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label="Classe" value={dashboard.class?.name ?? 'Non renseignee'} />
          <InfoBlock label="Formation" value={dashboard.student.formation ?? 'Non renseignee'} />
        </div>

        {placement ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <CalendarRange className="w-4 h-4 text-[var(--color-text-muted)]" />
              Dossier PFMP
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {formatDate(placement.startDate)} - {formatDate(placement.endDate)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-fg)]">
            Votre stage n'est pas encore assigne. Rapprochez-vous de votre professeur principal.
          </div>
        )}

        {dashboard.company && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Entreprise</h2>
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="font-medium text-[var(--color-text)]">{dashboard.company.name}</p>
              <p className="mt-1 flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formatAddress(dashboard.company)}</span>
              </p>
            </div>
          </div>
        )}

        {dashboard.tutor && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Tuteur entreprise</h2>
            <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
              <p className="font-medium text-[var(--color-text)]">
                {dashboard.tutor.firstName} {dashboard.tutor.lastName}
              </p>
              {dashboard.tutor.function && (
                <p className="mt-1 text-[var(--color-text-muted)]">{dashboard.tutor.function}</p>
              )}
              {dashboard.tutor.phone && (
                <p className="mt-2 flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Phone className="h-4 w-4" />
                  {dashboard.tutor.phone}
                </p>
              )}
            </div>
          </div>
        )}

        <StudentConventionCard dashboard={dashboard} onRefresh={onRefresh} />
      </CardBody>
    </Card>
  )
}

function StudentConventionCard({
  dashboard,
  onRefresh,
}: {
  dashboard: StudentPublicDashboard
  onRefresh: () => Promise<void>
}) {
  const convention = dashboard.convention
  const [sending, setSending] = useState<'parent' | 'tutor' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestSignature(target: 'parent' | 'tutor') {
    if (!convention) return
    setSending(target)
    setError(null)
    setMessage(null)
    try {
      const result = await requestStudentConventionSignature({
        data: {
          studentId: dashboard.student.id,
          documentId: convention.id,
          target,
        },
      })
      setMessage(`Lien envoye a ${result.recipientEmail}.`)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(null)
    }
  }

  if (!convention) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
          Convention PFMP
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Aucune convention n'est encore rattachee a votre dossier. Elle apparaitra ici des que votre classe est affectee a une periode PFMP.
        </p>
      </div>
    )
  }

  const pdfUrl = convention.finalDownloadUrl ?? convention.downloadUrl
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
          Convention PFMP
        </div>
        <Badge tone={getConventionTone(convention.status, convention.signatureStatus)}>
          {getConventionLabel(convention.status, convention.signatureStatus)}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{convention.name}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            <Button type="button" size="sm" variant="secondary" iconLeft={<Download className="w-4 h-4" />}>
              Telecharger PDF
            </Button>
          </a>
        )}
        {convention.canRequestParentSignature && (
          <Button
            type="button"
            size="sm"
            iconLeft={<Send className="w-4 h-4" />}
            onClick={() => requestSignature('parent')}
            disabled={sending !== null}
          >
            {sending === 'parent' ? 'Envoi...' : 'Envoyer au parent'}
          </Button>
        )}
        {convention.canRequestTutorSignature && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            iconLeft={<Send className="w-4 h-4" />}
            onClick={() => requestSignature('tutor')}
            disabled={sending !== null}
          >
            {sending === 'tutor' ? 'Envoi...' : 'Envoyer au tuteur'}
          </Button>
        )}
      </div>

      {!pdfUrl && (
        <p className="mt-3 rounded-md border border-amber-200 bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning-fg)]">
          Convention attribuee, mais PDF non genere. Votre etablissement doit generer le PDF apres validation du dossier.
        </p>
      )}

      {convention.signatures.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)] font-semibold">Signatures</p>
          {convention.signatures.map((signature) => (
            <div key={`${signature.role}-${signature.email}`} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs">
              <span className="font-medium text-[var(--color-text)]">
                {signature.name ?? signature.email} - {signatureRoleLabel(signature.role)}
              </span>
              <Badge tone={signature.status === 'signed' ? 'success' : 'warning'}>
                {signature.status === 'signed' ? 'Signe' : 'En attente'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {message && <p className="mt-3 text-xs text-green-700">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
    </div>
  )
}

function StudentInfoCard({
  dashboard,
  session,
  onRefresh,
}: {
  dashboard: StudentPublicDashboard
  session: StudentPublicSession
  onRefresh: () => Promise<void>
}) {
  const [form, setForm] = useState({
    birthDate: dashboard.student.birthDate ?? '',
    parentFirstName: dashboard.student.parentFirstName ?? '',
    parentLastName: dashboard.student.parentLastName ?? '',
    parentEmail: dashboard.student.parentEmail ?? '',
    parentPhone: dashboard.student.parentPhone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setForm({
      birthDate: dashboard.student.birthDate ?? '',
      parentFirstName: dashboard.student.parentFirstName ?? '',
      parentLastName: dashboard.student.parentLastName ?? '',
      parentEmail: dashboard.student.parentEmail ?? '',
      parentPhone: dashboard.student.parentPhone ?? '',
    })
  }, [dashboard.student.birthDate, dashboard.student.parentEmail, dashboard.student.parentFirstName, dashboard.student.parentLastName, dashboard.student.parentPhone])

  async function saveGuardian(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateStudentGuardianContact({
        data: {
          studentId: dashboard.student.id,
          birthDate: form.birthDate || null,
          parentFirstName: form.parentFirstName || null,
          parentLastName: form.parentLastName || null,
          parentEmail: form.parentEmail || null,
          parentPhone: form.parentPhone || null,
        },
      })
      setMessage('Informations responsable legal enregistrees.')
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<UserRound className="w-4 h-4" />}>Mes informations</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <InfoBlock label="Nom" value={`${dashboard.student.firstName} ${dashboard.student.lastName}`} />
        <InfoBlock label="Classe" value={session.className} />
        {dashboard.student.email && (
          <InfoLine icon={<Mail className="w-4 h-4" />} value={dashboard.student.email} />
        )}
        {dashboard.student.phone && (
          <InfoLine icon={<Phone className="w-4 h-4" />} value={dashboard.student.phone} />
        )}
        <InfoBlock label="Date de naissance" value={dashboard.student.birthDate ? formatDate(dashboard.student.birthDate) : 'Non renseignee'} />
        {!dashboard.student.email && !dashboard.student.phone && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Aucune coordonnee eleve n'est renseignee pour le moment.
          </p>
        )}
        <form onSubmit={saveGuardian} className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white p-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Responsable legal</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Ces informations servent a envoyer la convention en signature si vous etes mineur.
            </p>
          </div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            Date de naissance
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border-strong)] px-3 text-sm text-[var(--color-text)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">
              Prenom parent
              <input
                value={form.parentFirstName}
                onChange={(event) => setForm((current) => ({ ...current, parentFirstName: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border-strong)] px-3 text-sm text-[var(--color-text)]"
              />
            </label>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">
              Nom parent
              <input
                value={form.parentLastName}
                onChange={(event) => setForm((current) => ({ ...current, parentLastName: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border-strong)] px-3 text-sm text-[var(--color-text)]"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            Email parent
            <input
              type="email"
              value={form.parentEmail}
              onChange={(event) => setForm((current) => ({ ...current, parentEmail: event.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border-strong)] px-3 text-sm text-[var(--color-text)]"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            Telephone parent
            <input
              value={form.parentPhone}
              onChange={(event) => setForm((current) => ({ ...current, parentPhone: event.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border-strong)] px-3 text-sm text-[var(--color-text)]"
            />
          </label>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          {message && <p className="text-xs text-green-700">{message}</p>}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </form>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-2 text-xs text-[var(--color-text-muted)]">
          Session ouverte le {formatDateTime(session.validatedAt)}. Fermez l'onglet ou cliquez sur
          "Se deconnecter" pour quitter.
        </div>
      </CardBody>
    </Card>
  )
}

function CenteredState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
      {icon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
      {!action && (
        <Link to="/eleve" className="mt-5 inline-block text-sm font-medium text-[var(--color-brand-700)]">
          Retour au portail eleve
        </Link>
      )}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  )
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      {icon}
      {value}
    </p>
  )
}

function readStudentSession(): StudentPublicSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(STUDENT_SESSION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStudentPublicSession(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function isStudentPublicSession(value: unknown): value is StudentPublicSession {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.studentId === 'string' &&
    typeof record.firstName === 'string' &&
    typeof record.lastName === 'string' &&
    typeof record.className === 'string' &&
    typeof record.classId === 'string' &&
    typeof record.establishmentName === 'string' &&
    typeof record.validatedAt === 'string'
  )
}

function getStageLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Dossier en preparation',
    confirmed: 'Stage valide par le lycee',
    no_stage: 'Recherche de stage',
    found: 'Entreprise proposee',
    pending_convention: 'Convention a signer',
    signed_convention: 'Convention signee',
    in_progress: 'Stage en cours',
    completed: 'Stage termine',
    cancelled: 'Stage annule',
    interrupted: 'Stage interrompu',
  }
  return labels[status] ?? status
}

function getStageTone(status: string): BadgeTone {
  if (status === 'completed') return 'success'
  if (status === 'in_progress' || status === 'signed_convention') return 'info'
  if (status === 'interrupted' || status === 'cancelled') return 'danger'
  if (status === 'no_stage' || status === 'draft') return 'warning'
  if (status === 'confirmed') return 'info'
  return 'brand'
}

function getConventionLabel(status: string, signatureStatus: string | null): string {
  if (signatureStatus === 'fully_signed' || status === 'signed') return 'Convention signee'
  if (signatureStatus === 'partial_signed') return 'Signature partielle'
  if (signatureStatus === 'pending_signatures' || status === 'pending_signatures') return 'En signature'
  if (status === 'generated') return 'PDF pret'
  if (status === 'draft') return 'A verifier'
  if (status === 'missing') return 'Vierge attribuee'
  return status
}

function getConventionTone(status: string, signatureStatus: string | null): BadgeTone {
  if (signatureStatus === 'fully_signed' || status === 'signed') return 'success'
  if (signatureStatus === 'pending_signatures' || signatureStatus === 'partial_signed' || status === 'pending_signatures') {
    return 'warning'
  }
  if (status === 'generated' || status === 'draft') return 'info'
  if (status === 'missing') return 'neutral'
  return 'brand'
}

function signatureRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    parent: 'Parent',
    tutor: 'Tuteur entreprise',
    employer: 'Entreprise',
    ddfpt: 'DDFPT',
    admin: 'Administration',
    school: 'Etablissement',
    referent: 'Referent',
    principal: 'Professeur principal',
    student: 'Eleve',
  }
  return labels[role] ?? role
}

function formatDate(value: string | null): string {
  if (!value) return 'Date non renseignee'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatAddress(company: NonNullable<StudentPublicDashboard['company']>): string {
  const parts = [company.address, company.zipCode, company.city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Adresse non renseignee'
}
