import type { ReactNode } from 'react'
import { Bell, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { ROLE_LABELS } from '@/types'
import { SidebarProf, MobileSidebarProf } from '@/components/sidebars/SidebarProf'

interface AppLayoutProfProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppLayoutProf({ title, subtitle, actions, children }: AppLayoutProfProps) {
  const me = useCurrentUser()
  return (
    <div className="min-h-screen flex bg-emerald-50/30">
      <div className="hidden md:block">
        <SidebarProf role={me.role} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-emerald-100">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <MobileSidebarProf role={me.role} />
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-[var(--color-text)] truncate">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-emerald-700 truncate">{subtitle}</p>}
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg border border-emerald-100 bg-white text-sm text-[var(--color-text-subtle)] w-72">
              <Search className="w-4 h-4" />
              <span>Rechercher un eleve</span>
            </div>
            {actions}
            <Link
              to="/prof/alerts"
              className="relative w-9 h-9 inline-flex items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700 hover:text-emerald-900"
              aria-label="Alertes"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
            </Link>
            <div className="flex items-center gap-2 pl-3 border-l border-emerald-100">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ background: me.avatarColor || '#15803d' }}
              >
                {me.firstName[0]}
                {me.lastName[0]}
              </span>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-medium text-[var(--color-text)]">
                  {me.firstName} {me.lastName}
                </p>
                <p className="text-[10px] text-emerald-700">{ROLE_LABELS[me.role]}</p>
                <Link
                  to="/deconnexion"
                  preload={false}
                  className="text-[10px] font-medium text-[var(--color-text-muted)] hover:text-emerald-800"
                >
                  Deconnexion
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
