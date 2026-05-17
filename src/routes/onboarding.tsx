import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { getSupabase, isDemoMode } from '@/lib/supabase'
import { ROLE_LABELS } from '@/types'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Onboarding" subtitle="Mode demo">
        <EmptyState
          title="Onboarding indisponible en mode demo"
          description="Les invitations utilisateurs sont disponibles uniquement avec Supabase Auth."
        />
      </AppLayout>
    )
  }

  return <OnboardingSupabase />
}

function OnboardingSupabase() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (auth.loading) {
    return (
      <AppLayout title="Onboarding" subtitle="Activation du compte">
        <EmptyState
          icon={<KeyRound className="w-5 h-5" />}
          title="Verification de la session"
          description="Nous finalisons votre connexion apres le lien d'invitation."
        />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Onboarding" subtitle="Activation du compte">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session requise"
          description="Ouvrez le lien d'invitation depuis votre email ou connectez-vous."
          action={
            <Link to="/login">
              <Button>Aller a la connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.profile.role === 'superadmin') {
    return (
      <AppLayout title="Onboarding" subtitle="Activation du compte">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Compte superadmin detecte"
          description="Cette page sert uniquement a activer un compte invite. Deconnectez-vous du superadmin sur cet appareil, puis rouvrez le lien d'invitation depuis l'email du professeur."
          action={
            <Link to="/superadmin/dashboard">
              <Button>Retour console superadmin</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)
      setSuccess('Mot de passe defini. Redirection vers votre espace...')
      window.setTimeout(() => {
        navigate({ to: '/dashboard' })
      }, 650)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout title="Bienvenue sur PFMP Pilot AI" subtitle="Activation de votre compte">
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<CheckCircle2 className="w-4 h-4" />}>
                Compte rattache a votre etablissement
              </CardTitle>
              <CardDescription>
                Vous etes connecte avec le role {ROLE_LABELS[auth.profile.role]}.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoLine label="Nom" value={`${auth.profile.first_name} ${auth.profile.last_name}`} />
            <InfoLine label="Email" value={auth.profile.email} />
            <InfoLine label="Role" value={ROLE_LABELS[auth.profile.role]} />
            <InfoLine
              label="Tenant"
              value={auth.profile.establishment_id ? 'Etablissement rattache' : 'Console superadmin'}
            />
          </CardBody>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle icon={<KeyRound className="w-4 h-4" />}>
                  Definir votre mot de passe
                </CardTitle>
                <CardDescription>
                  Ce mot de passe servira pour vos prochaines connexions.
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <FieldHint>8 caracteres minimum.</FieldHint>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmation</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </CardBody>
            <CardFooter className="gap-3 justify-end">
              {error && (
                <p className="mr-auto text-sm font-medium text-[var(--color-danger)]">{error}</p>
              )}
              {success && (
                <p className="mr-auto text-sm font-medium text-[var(--color-success-fg)]">
                  {success}
                </p>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Activation...' : 'Activer mon compte'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-medium text-[var(--color-text)] break-words">{value}</p>
    </div>
  )
}
