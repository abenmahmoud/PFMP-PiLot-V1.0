import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Network,
  Route,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { UserRole } from '@/types'

interface ProfNavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const PROF_NAV: ProfNavItem[] = [
  { to: '/prof/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['principal', 'referent'] },
  { to: '/prof/my-classes', label: 'Mes classes', icon: Users, roles: ['principal'] },
  { to: '/prof/my-students', label: 'Mes eleves', icon: GraduationCap, roles: ['principal', 'referent'] },
  { to: '/prof/placements', label: 'Mes affectations', icon: Network, roles: ['principal', 'referent'] },
  { to: '/prof/visits', label: 'Mes visites', icon: Route, roles: ['referent', 'principal'] },
  { to: '/prof/visits/tour', label: 'Tournee du jour', icon: Route, roles: ['referent', 'principal'] },
  { to: '/prof/alerts', label: 'Alertes', icon: Bell, roles: ['principal', 'referent'] },
  { to: '/prof/companies', label: 'Entreprises', icon: Building2, roles: ['principal', 'referent'] },
  { to: '/prof/pfmp-periods', label: 'Periodes PFMP', icon: Calendar, roles: ['principal', 'referent'] },
  { to: '/prof/reports', label: 'Comptes-rendus', icon: ClipboardCheck, roles: ['referent'] },
]

function ProfNavLink({ item, onNavigate }: { item: ProfNavItem; onNavigate?: () => void }) {
  const router = useRouterState()
  const active =
    router.location.pathname === item.to ||
    (item.to !== '/' && router.location.pathname.startsWith(`${item.to}/`))
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-800'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] hover:text-[var(--color-text)]',
      )}
    >
      <Icon className={cn('w-4 h-4', active ? 'text-emerald-700' : 'text-[var(--color-text-subtle)]')} />
      <span>{item.label}</span>
    </Link>
  )
}

export function SidebarProf({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const items = PROF_NAV.filter((item) => item.roles.includes(role))
  return (
    <aside className="h-full w-64 shrink-0 border-r border-emerald-100 bg-white flex flex-col">
      <div className="px-5 py-4 border-b border-emerald-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
          P
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight">PFMP Pilot AI</p>
          <p className="text-[11px] text-emerald-700">Espace professeur</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        <p className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
          Suivi PFMP
        </p>
        {items.map((item) => (
          <ProfNavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  )
}

export function MobileSidebarProf({ role }: { role: UserRole }) {
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
        className="md:hidden inline-flex w-9 h-9 items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-emerald-50"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarProf role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
