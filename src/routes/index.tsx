import { createFileRoute, Link } from '@tanstack/react-router'
import { GraduationCap, Shield, UserRound } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: PortalHomePage,
})

function PortalHomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),radial-gradient(circle_at_bottom_right,#fed7aa,transparent_30%),linear-gradient(135deg,#f8fafc,#ecfdf5)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-admin)] text-lg font-bold text-white">
            P
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              PFMP Pilot AI
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
              Choisissez votre espace
            </h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PortalCard
            to="/admin/login"
            icon={<Shield className="h-7 w-7" />}
            title="Administration"
            description="Chef d'etablissement, DDFPT, superadmin : pilotage complet du tenant."
            tone="blue"
          />
          <PortalCard
            to="/prof/login"
            icon={<GraduationCap className="h-7 w-7" />}
            title="Professeur"
            description="Prof principal ou referent PFMP : classes, eleves, visites et suivi terrain."
            tone="green"
          />
          <PortalCard
            to="/eleve"
            icon={<UserRound className="h-7 w-7" />}
            title="Eleve"
            description="Acces rapide avec le code PFMP ou le QR code donne par l'etablissement."
            tone="orange"
          />
        </div>
      </div>
    </main>
  )
}

function PortalCard({
  to,
  icon,
  title,
  description,
  tone,
}: {
  to: '/admin/login' | '/prof/login' | '/eleve'
  icon: React.ReactNode
  title: string
  description: string
  tone: 'blue' | 'green' | 'orange'
}) {
  const toneClass = {
    blue: 'border-blue-100 text-blue-800 hover:border-blue-300 hover:bg-blue-50/70',
    green: 'border-emerald-100 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50/70',
    orange: 'border-orange-100 text-orange-800 hover:border-orange-300 hover:bg-orange-50/70',
  }[tone]

  return (
    <Link
      to={to}
      className={`group rounded-2xl border bg-white/88 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur transition ${toneClass}`}
    >
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition group-hover:scale-[1.03]">
        {icon}
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      <p className="mt-6 text-sm font-semibold">Entrer dans cet espace</p>
    </Link>
  )
}
