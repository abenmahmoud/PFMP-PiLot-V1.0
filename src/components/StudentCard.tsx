import { Link, useRouterState } from '@tanstack/react-router'
import { Building2, MapPin, Calendar, ChevronRight } from 'lucide-react'
import type { Student } from '@/types'
import { StageStatusBadge } from './StatusBadge'
import { classes, companies, pfmpPeriods, teachers } from '@/data/demo'
import { cn } from '@/lib/cn'

interface StudentCardProps {
  student: Student
  className?: string
}

export function StudentCard({ student, className }: StudentCardProps) {
  const router = useRouterState()
  const isProfPortal = router.location.pathname.startsWith('/prof')
  const klass = classes.find((c) => c.id === student.classId)
  const company = companies.find((c) => c.id === student.companyId)
  const period = pfmpPeriods.find((p) => p.id === student.periodId)
  const ref = teachers.find((t) => t.id === student.referentId)

  const initials = `${student.firstName[0]}${student.lastName[0]}`

  return (
    <Link
      to={isProfPortal ? '/prof/students/$id' : '/admin/students/$id'}
      params={{ id: student.id }}
      className={cn(
        'card p-4 flex items-start gap-3 hover:border-[var(--color-brand-500)]/40 hover:shadow-[var(--shadow-soft)] transition-all',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center text-sm font-semibold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[var(--color-text)] truncate">
            {student.firstName} {student.lastName}
          </p>
          <StageStatusBadge status={student.stageStatus} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {klass?.name} · {student.formation}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[var(--color-text-muted)]">
          {company && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{company.name}</span>
            </span>
          )}
          {company && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{company.city}</span>
            </span>
          )}
          {period && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="truncate">{period.name}</span>
            </span>
          )}
          {ref && (
            <span className="truncate">Référent : {ref.firstName} {ref.lastName}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-text-subtle)] shrink-0 mt-1" />
    </Link>
  )
}
