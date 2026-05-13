import type { CSSProperties, ReactNode } from 'react'
import { Bell, Search, Shield } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SidebarAdmin, MobileSidebarAdmin } from '@/components/sidebars/SidebarAdmin'
import { SuperadminTenantSwitcher } from '@/components/SuperadminTenantSwitcher'
import { ROLE_LABELS } from '@/types'
import { useCurrentUser } from '@/lib/useCurrentUser'

interface AppLayoutSuperadminProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

const superadminTheme = {
  '--color-brand': 'var(--color-brand-superadmin)',
  '--color-brand-50': 'var(--color-brand-superadmin-50)',
  '--color-brand-100': 'var(--color-brand-superadmin-100)',
  '--color-brand-500': 'var(--color-brand-superadmin-500)',
  '--color-brand-600': 'var(--color-brand-superadmin-600)',
  '--color-brand-700': 'var(--color-brand-superadmin-700)',
} as CSSProperties

export function AppLayoutSuperadmin({
  title,
  subtitle,
  actions,
  children,
}: AppLayoutSuperadminProps) {
  const me = useCurrentUser()
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]" style={superadminTheme}>
      <div className="hidden md:block">
        <SidebarAdmin role={me.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-[var(--color-brand-superadmin)] px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
          Mode superadmin · vue groupe scolaire
        </div>
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <MobileSidebarAdmin role={me.role} />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-superadmin)] text-white sm:inline-flex">
                <Shield className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-subtle)] md:flex">
              <Search className="h-4 w-4" />
              <span>Recherche globale (Ctrl+K)</span>
            </div>
            {actions}
            <SuperadminTenantSwitcher />
            <Link
              to="/superadmin/audit"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Audit"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
            </Link>
            <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: me.avatarColor || '#4c1d95' }}
              >
                {me.firstName[0]}
                {me.lastName[0]}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium text-[var(--color-text)]">
                  {me.firstName} {me.lastName}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{ROLE_LABELS[me.role]}</p>
                <Link
                  to="/deconnexion"
                  preload={false}
                  className="text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Deconnexion
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}

