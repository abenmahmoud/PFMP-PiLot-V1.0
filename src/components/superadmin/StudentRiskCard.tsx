import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { StudentRiskInsight } from '@/server/superadminDashboard.functions'

export function StudentRiskCard({ risk }: { risk: StudentRiskInsight }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            {risk.studentName}
          </p>
          <p className="mt-1 text-xs text-amber-900">
            {risk.establishmentName} · {risk.className ?? 'Classe non renseignee'}
          </p>
          <p className="mt-1 text-xs text-amber-900">
            {risk.periodName} commence le {new Date(risk.startsAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <Badge tone={risk.daysBeforeStart <= 3 ? 'danger' : 'warning'}>
          J-{risk.daysBeforeStart}
        </Badge>
      </div>
      <Link
        to="/admin/students/$id"
        params={{ id: risk.studentId }}
        className="mt-3 inline-flex text-xs font-medium text-amber-950 underline underline-offset-2"
      >
        Ouvrir la fiche eleve
      </Link>
    </div>
  )
}

