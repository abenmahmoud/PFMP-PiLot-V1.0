import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/eleve')({ component: StudentEntryPage })

function StudentEntryPage() {
  const initialCode = useMemo(() => readInitialCode(), [])
  const [code, setCode] = useState(initialCode)
  const normalized = code.trim().toUpperCase()

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-700)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour connexion adultes
        </Link>

        <div className="mt-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Acces eleve</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Entrez le code personnel donne par votre professeur principal.
            </p>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-[var(--color-text)]">Code personnel</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PFMP-XXXX-XXXX"
            className="mt-2 h-12 w-full rounded-lg border border-[var(--color-border-strong)] px-4 font-mono text-lg uppercase tracking-wide outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-100)]"
          />
        </label>

        <div className="mt-5 rounded-lg border border-amber-200 bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning-fg)]">
          La verification du code arrive au sprint suivant. Pour l'instant, cette page prepare
          le portail eleve sans creer de compte email.
        </div>

        <Button
          type="button"
          className="mt-5 w-full"
          iconLeft={<ShieldCheck className="w-4 h-4" />}
          disabled={normalized.length < 8}
          onClick={() => window.alert('Verification du code prevue en P1.5/P1.6.')}
        >
          Continuer
        </Button>
      </section>
    </main>
  )
}

function readInitialCode(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('code') ?? ''
}
