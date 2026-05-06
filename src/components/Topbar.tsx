import { Bell, Search } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { ROLE_LABELS } from '@/types'
import { Link } from '@tanstack/react-router'
import { MobileSidebar } from './Sidebar'
import { SuperadminTenantSwitcher } from './SuperadminTenantSwitcher'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const me = useCurrentUser()
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-[var(--color-border)]">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
        <MobileSidebar role={me.role} />
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-[var(--color-text)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-subtle)] w-72">
          <Search className="w-4 h-4" />
          <span>Recherche globale (Ctrl+K)</span>
        </div>
        {actions}
        <SuperadminTenantSwitcher />
        <Link
          to="/alerts"
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="Alertes"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
        </Link>
        <div className="flex items-center gap-2 pl-3 border-l border-[var(--color-border)]">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: me.avatarColor || '#475569' }}
          >
            {me.firstName[0]}
            {me.lastName[0]}
          </span>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-medium text-[var(--color-text)]">
              {me.firstName} {me.lastName}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{ROLE_LABELS[me.role]}</p>
            <Link
              to="/deconnexion"
              preload={false}
              {...({ prefetch: false } as { prefetch: false })}
              className="text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Déconnexion
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
