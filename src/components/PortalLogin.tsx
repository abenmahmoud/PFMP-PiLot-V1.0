import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, GraduationCap, Lock, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import {
  buildAuthState,
  resetPasswordForEmail,
  signInWithPassword,
  signOut,
} from '@/lib/auth'
import { isDemoMode } from '@/lib/supabase'
import {
  getHomePathForRole,
  isAdminPortalRole,
  isProfPortalRole,
} from '@/lib/permissions'
import type { UserRole } from '@/lib/database.types'

interface PortalLoginProps {
  portal: 'admin' | 'prof'
}

export function PortalLogin({ portal }: PortalLoginProps) {
  const navigate = useNavigate()
  const isAdmin = portal === 'admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const theme = isAdmin
    ? {
        icon: <Shield className="h-5 w-5" />,
        title: 'Connexion administration',
        subtitle: 'Chef d etablissement, DDFPT ou superadmin.',
        bg: 'from-blue-950 via-blue-800 to-blue-700',
        button: undefined,
        home: '/admin/dashboard' as const,
        alternateText: 'Vous etes professeur ?',
        alternateTo: '/prof/login' as const,
        rejected: "Vous n'etes pas administrateur sur PFMP Pilot AI.",
      }
    : {
        icon: <GraduationCap className="h-5 w-5" />,
        title: 'Connexion professeur',
        subtitle: 'Professeur principal ou referent PFMP.',
        bg: 'from-emerald-950 via-emerald-800 to-emerald-700',
        button: 'bg-emerald-700 hover:bg-emerald-800',
        home: '/prof/dashboard' as const,
        alternateText: 'Vous etes administrateur ?',
        alternateTo: '/admin/login' as const,
        rejected: "Vous n'etes pas rattache a un espace professeur.",
      }

  function isAllowed(role: UserRole | null): boolean {
    return isAdmin ? isAdminPortalRole(role) : isProfPortalRole(role)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)

    if (isDemoMode()) {
      setSubmitting(false)
      navigate({ to: theme.home })
      return
    }

    const result = await signInWithPassword(email, password)
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }

    const auth = await buildAuthState()
    setSubmitting(false)

    if (!isAllowed(auth.role)) {
      await signOut()
      setError(theme.rejected)
      return
    }

    navigate({ to: getHomePathForRole(auth.role) })
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setError('Saisissez votre email avant de demander un nouveau mot de passe.')
      return
    }
    setError(null)
    setNotice(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const result = await resetPasswordForEmail(email.trim(), `${origin}${isAdmin ? '/admin/login' : '/prof/login'}`)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice('Email de reinitialisation envoye si ce compte existe.')
  }

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <section className={`hidden md:flex flex-col justify-between bg-gradient-to-br ${theme.bg} p-10 text-white`}>
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
              P
            </div>
            <span className="font-semibold tracking-tight">PFMP Pilot AI</span>
          </Link>
          <h1 className="mt-16 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Un espace separe pour travailler plus vite, sans melanger les roles.
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-white/80">
            Chaque public arrive dans son interface : administration, professeur ou eleve.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-brand-admin)]">
            {theme.icon}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{theme.title}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{theme.subtitle}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor={`${portal}-email`}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                <Input
                  id={`${portal}-email`}
                  type="email"
                  className="pl-9"
                  placeholder="vous@etablissement.fr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${portal}-password`}>Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                <Input
                  id={`${portal}-password`}
                  type="password"
                  className="pl-9"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className={`w-full ${theme.button ?? ''}`}
              size="lg"
              iconRight={<ArrowRight className="h-4 w-4" />}
              disabled={submitting}
            >
              {submitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleResetPassword}
            className="mt-3 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Mot de passe oublie ?
          </button>

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)]">
            <Link to={theme.alternateTo} className="font-medium hover:text-[var(--color-text)]">
              {theme.alternateText}
            </Link>
            <Link to="/eleve" className="font-medium hover:text-[var(--color-text)]">
              Vous etes eleve ?
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
