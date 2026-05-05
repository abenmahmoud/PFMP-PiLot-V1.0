import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { StudentCard } from '@/components/StudentCard'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { students, classes, pfmpPeriods } from '@/data/demo'

export const Route = createFileRoute('/my-students')({ component: MyStudentsPage })

function MyStudentsPage() {
  return (
    <AppLayout
      title="Mes élèves"
      subtitle="Vue référent · élèves dont vous êtes responsable"
    >
      <RoleGuard allow={['referent', 'principal']}>
        <Inner />
      </RoleGuard>
    </AppLayout>
  )
}

function Inner() {
  const me = useCurrentUser()
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')

  let mine = students.filter((s) =>
    me.role === 'principal'
      ? classes.find((c) => c.id === s.classId)?.principalId === me.id
      : s.referentId === me.id,
  )

  if (classFilter !== 'all') mine = mine.filter((s) => s.classId === classFilter)
  if (periodFilter !== 'all') mine = mine.filter((s) => s.periodId === periodFilter)
  if (q) {
    const ql = q.toLowerCase()
    mine = mine.filter(
      (s) =>
        s.firstName.toLowerCase().includes(ql) ||
        s.lastName.toLowerCase().includes(ql) ||
        s.formation.toLowerCase().includes(ql),
    )
  }

  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'

  return (
    <>
      <SearchFilterBar
        query={q}
        onQueryChange={setQ}
        placeholder="Rechercher un élève…"
        filters={
          <>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={filterSelect}
            >
              <option value="all">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className={filterSelect}
            >
              <option value="all">Toutes les périodes</option>
              {pfmpPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      {mine.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          title="Aucun élève à afficher"
          description="Aucun élève ne correspond aux filtres ou aucune affectation n'existe encore pour ce rôle."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mine.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </>
  )
}
