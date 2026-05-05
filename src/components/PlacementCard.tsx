import { Link } from '@tanstack/react-router'
import { Building2, MapPin, Phone, Mail, Calendar, ChevronRight } from 'lucide-react'
import type { Placement } from '@/types'
import { companies, students, tutors, pfmpPeriods } from '@/data/demo'
import { StageStatusBadge } from './StatusBadge'

export function PlacementCard({ placement }: { placement: Placement }) {
  const student = students.find((s) => s.id === placement.studentId)
  const company = companies.find((c) => c.id === placement.companyId)
  const tutor = tutors.find((t) => t.id === placement.tutorId)
  const period = pfmpPeriods.find((p) => p.id === placement.periodId)

  if (!student) return null

  return (
    <Link
      to="/placements/$id"
      params={{ id: placement.id }}
      className="card p-4 block hover:border-[var(--color-brand-500)]/40 hover:shadow-[var(--shadow-soft)] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--color-text)]">
            {student.firstName} {student.lastName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{student.formation}</p>
        </div>
        <StageStatusBadge status={placement.status} />
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-[var(--color-text)]">
        {company && (
          <p className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--color-text-subtle)]" />
            <span className="font-medium">{company.name}</span>
          </p>
        )}
        {company && (
          <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <MapPin className="w-3.5 h-3.5" />
            {company.address}, {company.zipCode} {company.city}
          </p>
        )}
        {tutor && (
          <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            Tuteur : {tutor.firstName} {tutor.lastName} · {tutor.function}
          </p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)] pt-1">
          {tutor?.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {tutor.phone}
            </span>
          )}
          {tutor?.email && (
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />
              {tutor.email}
            </span>
          )}
          {period && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {period.name}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end text-xs text-[var(--color-brand-700)] font-medium">
        Ouvrir la fiche <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  )
}
