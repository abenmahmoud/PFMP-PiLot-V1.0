import { CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { ComplianceCheck } from '@/server/superadminDashboard.functions'

const ICONS = {
  ok: CheckCircle2,
  warning: TriangleAlert,
  danger: ShieldAlert,
}

const COLORS = {
  ok: 'text-[var(--color-success-fg)] bg-[var(--color-success-bg)] border-emerald-200',
  warning: 'text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border-amber-200',
  danger: 'text-[var(--color-danger-fg)] bg-[var(--color-danger-bg)] border-red-200',
}

export function ComplianceChecks({ checks }: { checks: ComplianceCheck[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance & sante</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {checks.map((check) => {
          const Icon = ICONS[check.status]
          return (
            <div key={check.key} className={`rounded-lg border px-3 py-2 ${COLORS[check.status]}`}>
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  <p className="text-xs opacity-90">{check.detail}</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}

