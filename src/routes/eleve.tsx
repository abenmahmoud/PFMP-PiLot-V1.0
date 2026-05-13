import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  validateStudentCode,
  type StudentCodeError,
  type StudentPublicSession,
} from '@/server/studentPortal.functions'

const STUDENT_SESSION_KEY = 'pfmp_student_session'

export const Route = createFileRoute('/eleve')({ component: StudentEntryPage })

function StudentEntryPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/eleve/dashboard', fuzzy: true })
  if (isOnChild) return <Outlet />
  return <StudentEntryForm />
}

function StudentEntryForm() {
  const navigate = useNavigate()
  const initialCode = useMemo(() => formatCodeInput(readInitialCode()), [])
  const autoSubmitDone = useRef(false)
  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialCode || autoSubmitDone.current) return
    autoSubmitDone.current = true
    void submitCode(initialCode)
    // submitCode intentionally reads the latest navigate function and local setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode])

  async function submitCode(rawCode: string) {
    const nextCode = formatCodeInput(rawCode)
    if (compactCode(nextCode).length < 12) {
      setError('Code incomplet. Verifiez le format PFMP-XXXX-XXXX.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await validateStudentCode({ data: { code: nextCode } })
      if (!result.ok) {
        setError(getCodeErrorMessage(result.error))
        return
      }
      saveStudentSession(result.session)
      navigate({ to: '/eleve/dashboard' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitCode(code)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--color-brand-50)] via-white to-slate-100 px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white font-bold">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">PFMP Pilot AI</p>
            <p className="text-xs text-[var(--color-text-muted)]">Espace eleve sans email</p>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Acceder a mon suivi PFMP
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Entrez le code personnel remis par votre professeur principal, ou scannez le QR code.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text)]">Code personnel</span>
            <input
              value={code}
              onChange={(event) => setCode(formatCodeInput(event.target.value))}
              placeholder="PFMP-XXXX-XXXX"
              autoComplete="one-time-code"
              className="mt-2 h-12 w-full rounded-lg border border-[var(--color-border-strong)] px-4 font-mono text-lg uppercase tracking-wide outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-100)]"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            iconLeft={<ShieldCheck className="w-4 h-4" />}
            iconRight={<ArrowRight className="w-4 h-4" />}
            disabled={loading || compactCode(code).length < 12}
          >
            {loading ? 'Verification...' : 'Acceder a mon espace'}
          </Button>
        </form>

        <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
          Ce portail ne cree pas de compte email. Votre code sert uniquement a afficher votre suivi
          de stage en lecture seule.
        </div>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-xs font-medium text-[var(--color-brand-700)]">
            Vous etes un professeur ? Connexion
          </Link>
        </div>
      </section>
    </main>
  )
}

function readInitialCode(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('code') ?? ''
}

function formatCodeInput(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  if (compact.length <= 4) return compact
  const parts = [compact.slice(0, 4), compact.slice(4, 8), compact.slice(8, 12)].filter(Boolean)
  return parts.join('-')
}

function compactCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function getCodeErrorMessage(error: StudentCodeError): string {
  if (error === 'CODE_REVOKED') {
    return 'Ce code a ete revoque. Demandez un nouveau code a votre professeur.'
  }
  if (error === 'CODE_EXPIRED') {
    return 'Ce code a expire. Demandez un nouveau code a votre professeur.'
  }
  return 'Code non reconnu. Verifiez les caracteres.'
}

function saveStudentSession(session: StudentPublicSession): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session))
}
