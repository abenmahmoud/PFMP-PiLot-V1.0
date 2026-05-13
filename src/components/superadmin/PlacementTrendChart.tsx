import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { MonthlyTrends } from '@/server/superadminDashboard.functions'

export function PlacementTrendChart({ trends }: { trends: MonthlyTrends }) {
  const values = trends.placements_per_month.map((item) => item.count)
  const max = Math.max(1, ...values)
  const width = 720
  const height = 220
  const padding = 28
  const points = trends.placements_per_month.map((item, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) / Math.max(1, trends.placements_per_month.length - 1)
    const y = height - padding - (item.count / max) * (height - padding * 2)
    return { ...item, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Evolution placements 12 mois</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)]">
            Placements, visites et nouvelles entreprises par mois
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[680px] w-full">
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
            <path d={path} fill="none" stroke="var(--color-brand-superadmin-700)" strokeWidth="3" />
            {points.map((point) => (
              <g key={point.month}>
                <circle cx={point.x} cy={point.y} r="4" fill="var(--color-brand-superadmin-700)" />
                <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
                  {point.month.slice(5)}
                </text>
                <text x={point.x} y={point.y - 8} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
                  {point.count}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Legend label="Placements" value={sum(trends.placements_per_month)} />
          <Legend label="Visites" value={sum(trends.visits_per_month)} />
          <Legend label="Entreprises" value={sum(trends.new_companies_per_month)} />
        </div>
      </CardBody>
    </Card>
  )
}

function Legend({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2">
      <p className="text-[var(--color-text-muted)]">{label}</p>
      <p className="font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  )
}

function sum(items: Array<{ count: number }>): number {
  return items.reduce((total, item) => total + item.count, 0)
}

