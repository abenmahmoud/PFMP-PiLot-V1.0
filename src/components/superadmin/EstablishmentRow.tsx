import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { EstablishmentBreakdownItem } from '@/server/superadminDashboard.functions'

export function EstablishmentRow({ item }: { item: EstablishmentBreakdownItem }) {
  const tone = item.placement_rate >= 85 ? 'success' : item.placement_rate >= 60 ? 'warning' : 'danger'
  return (
    <li className="grid grid-cols-1 gap-3 py-3 md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(80px,0.5fr))_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
            {item.establishment.name}
          </p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {item.establishment.city ?? 'Ville non renseignee'}
          </p>
        </div>
      </div>
      <Metric label="Eleves" value={item.students} />
      <Metric label="Placements" value={item.placements} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">Taux</p>
        <Badge tone={tone} dot>
          {item.placement_rate}%
        </Badge>
      </div>
      <Metric label="Actions" value={item.pending_actions} danger={item.pending_actions > 0} />
      <Link
        to="/superadmin/establishments/$id"
        params={{ id: item.establishment.id }}
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-muted)]"
      >
        Voir <ArrowUpRight className="h-3 w-3" />
      </Link>
    </li>
  )
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">{label}</p>
      <p className={danger ? 'text-sm font-semibold text-[var(--color-danger-fg)]' : 'text-sm font-semibold'}>
        {value}
      </p>
    </div>
  )
}

