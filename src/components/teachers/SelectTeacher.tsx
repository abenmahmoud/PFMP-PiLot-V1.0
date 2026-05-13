import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, Label, Select } from '@/components/ui/Field'
import type { UserRole } from '@/lib/database.types'
import type { TeacherWithStats } from '@/server/teachers.functions'

interface SelectTeacherProps {
  id?: string
  label?: string
  teachers: TeacherWithStats[]
  value: string | null
  roles?: UserRole[]
  allowNone?: boolean
  onChange: (teacherId: string | null) => void
}

export function SelectTeacher({
  id = 'select-teacher',
  label = 'Professeur',
  teachers,
  value,
  roles,
  allowNone = true,
  onChange,
}: SelectTeacherProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return teachers.filter((teacher) => {
      if (roles && (!teacher.role || !roles.includes(teacher.role))) return false
      if (!teacher.profile_id && roles) return false
      if (!normalized) return true
      return `${teacher.first_name} ${teacher.last_name} ${teacher.email ?? ''} ${teacher.discipline ?? ''}`
        .toLowerCase()
        .includes(normalized)
    })
  }, [query, roles, teachers])

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-search`}>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" />
        <Input
          id={`${id}-search`}
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un professeur..."
        />
      </div>
      <Select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {allowNone && <option value="">Aucun</option>}
        {filtered.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.first_name} {teacher.last_name}
            {teacher.discipline ? ` - ${teacher.discipline}` : ''}
          </option>
        ))}
      </Select>
      {roles && filtered.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Aucun professeur avec compte compatible. Invitez d'abord le professeur avec le bon role.
        </p>
      )}
    </div>
  )
}

