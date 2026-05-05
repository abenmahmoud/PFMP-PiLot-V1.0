import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[var(--color-brand)] via-[var(--color-brand-700)] to-[#0b1f5b] text-white">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold">
              P
            </div>
            <span className="font-semibold tracking-tight">PFMP Pilot AI</span>
          </div>
          <h1 className="mt-16 text-3xl font-semibold tracking-tight leading-tight max-w-md">
            Le pilotage des stages, simplifié pour les lycées professionnels.
          </h1>
          <p className="mt-4 text-white/80 max-w-md leading-relaxed">
            Suivez vos PFMP, vos visites et vos comptes rendus depuis le terrain. Une plateforme
            mobile-first, multi-établissement, conçue pour les CAP et Bac Pro.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-white/80">
          <li className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Assistant IA responsable, validation humaine obligatoire</li>
          <li className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Multi-établissement, RLS Supabase</li>
          <li className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Mobile-first, utilisable en visite d'entreprise</li>
        </ul>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Accédez à votre espace PFMP Pilot AI.
          </p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="vous@etablissement.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>
              Se connecter
            </Button>
          </form>
          <div className="mt-6 rounded-lg border border-dashed border-[var(--color-border-strong)] p-4 text-xs text-[var(--color-text-muted)]">
            <p className="font-medium text-[var(--color-text)] mb-1">Mode démo</p>
            L'authentification Supabase n'est pas encore branchée. Cliquez ci-dessous pour
            entrer dans la démo.
          </div>
          <Link
            to="/dashboard"
            className="mt-3 inline-flex w-full items-center justify-center h-10 rounded-lg bg-[var(--color-muted)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]"
          >
            Entrer dans la démo
          </Link>
        </div>
      </div>
    </div>
  )
}
