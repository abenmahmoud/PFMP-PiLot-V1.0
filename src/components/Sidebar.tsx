import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  Calendar,
  Network,
  UserCog,
  FileText,
  Bell,
  Download,
  Settings,
  History,
  Shield,
  Sparkles,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'
import { getCurrentUser, profiles } from '@/data/demo'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
  section: 'main' | 'super'
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'ddfpt', 'principal', 'referent'], section: 'main' },
  { to: '/my-students', label: 'Mes élèves', icon: GraduationCap, roles: ['principal', 'referent'], section: 'main' },
  { to: '/classes', label: 'Classes', icon: Users, roles: ['admin', 'ddfpt', 'principal'], section: 'main' },
  { to: '/students', label: 'Élèves', icon: GraduationCap, roles: ['admin', 'ddfpt', 'principal'], section: 'main' },
  { to: '/teachers', label: 'Professeurs', icon: UserCog, roles: ['admin', 'ddfpt'], section: 'main' },
  { to: '/companies', label: 'Entreprises', icon: Building2, roles: ['admin', 'ddfpt', 'referent'], section: 'main' },
  { to: '/pfmp-periods', label: 'Périodes PFMP', icon: Calendar, roles: ['admin', 'ddfpt'], section: 'main' },
  { to: '/assignments', label: 'Affectations', icon: Network, roles: ['ddfpt', 'principal'], section: 'main' },
  { to: '/documents', label: 'Documents', icon: FileText, roles: ['admin', 'ddfpt', 'referent'], section: 'main' },
  { to: '/alerts', label: 'Alertes', icon: Bell, roles: ['admin', 'ddfpt', 'referent'], section: 'main' },
  { to: '/exports', label: 'Exports', icon: Download, roles: ['admin', 'ddfpt'], section: 'main' },
  { to: '/activity', label: 'Activité', icon: History, roles: ['admin', 'ddfpt'], section: 'main' },
  { to: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin', 'ddfpt'], section: 'main' },

  { to: '/superadmin', label: 'Vue globale', icon: Shield, roles: ['superadmin'], section: 'super' },
  { to: '/superadmin/establishments', label: 'Établissements', icon: Briefcase, roles: ['superadmin'], section: 'super' },
  { to: '/superadmin/ai', label: 'Assistant IA', icon: Sparkles, roles: ['superadmin'], section: 'super' },
]

interface SidebarProps {
  role: UserRole
  onNavigate?: () => void
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const router = useRouterState()
  const active =
    router.location.pathname === item.to ||
    (item.to !== '/' && router.location.pathname.startsWith(item.to + '/'))
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] hover:text-[var(--color-text)]',
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4',
          active ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-subtle)]',
        )}
      />
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const items = NAV.filter((n) => n.roles.includes(role))
  const main = items.filter((i) => i.section === 'main')
  const sup = items.filter((i) => i.section === 'super')

  return (
    <aside className="h-full w-64 shrink-0 border-r border-[var(--color-border)] bg-white flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-500)] flex items-center justify-center text-white text-sm font-bold">
          P
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight">PFMP Pilot AI</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Pilotage des stages</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {sup.length > 0 && (
          <>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
              Superadmin
            </p>
            {sup.map((item) => (
              <NavLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
            <div className="h-3" />
          </>
        )}
        {main.length > 0 && (
          <>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
              Établissement
            </p>
            {main.map((item) => (
              <NavLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      <UserSwitcher />
    </aside>
  )
}

function UserSwitcher() {
  const me = getCurrentUser()
  return (
    <div className="border-t border-[var(--color-border)] px-3 py-3">
      <p className="px-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
        Démo : changer de rôle
      </p>
      <div className="space-y-1">
        {profiles.slice(0, 5).map((p) => (
          <button
            key={p.id}
            onClick={() => {
              try {
                localStorage.setItem('pfmp_demo_user', p.id)
                window.location.reload()
              } catch {}
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs hover:bg-[var(--color-muted)] transition-colors',
              me.id === p.id && 'bg-[var(--color-brand-50)]',
            )}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
              style={{ background: p.avatarColor || '#475569' }}
            >
              {p.firstName[0]}
              {p.lastName[0]}
            </span>
            <span className="flex-1 truncate">
              <span className="block truncate text-[var(--color-text)]">
                {p.firstName} {p.lastName}
              </span>
              <span className="block truncate text-[10px] text-[var(--color-text-muted)]">
                {ROLE_LABELS[p.role]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function MobileSidebar({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false)
  const router = useRouterState()
  useEffect(() => {
    setOpen(false)
  }, [router.location.pathname])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex w-9 h-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-muted)]"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
