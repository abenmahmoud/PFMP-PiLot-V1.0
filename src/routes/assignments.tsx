import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Network } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TeacherLoadIndicator } from '@/components/TeacherLoadIndicator'
import { StageStatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchAssignmentOptions,
  fetchAssignments,
  fetchTeacherLoads,
  type AssignmentListItem,
  type AssignmentOptions,
  type TeacherLoadItem,
} from '@/services/assignments'
import { classes, pfmpPeriods, students, teachers, companies } from '@/data/demo'

export const Route = createFileRoute('/assignments')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/assignments' })
  },
  component: AssignmentsPage,
})

const LOAD_TIMEOUT_MS = 12000
const TEACHER_LOAD_THRESHOLD = 6

export function AssignmentsPage() {
  if (isDemoMode()) return <AssignmentsDemo />
  return <AssignmentsSupabase />
}

function AssignmentsSupabase() {
  const auth = useAuth()
  const [classFilter, setClassFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [rows, setRows] = useState<AssignmentListItem[]>([])
  const [loads, setLoads] = useState<TeacherLoadItem[]>([])
  const [options, setOptions] = useState<AssignmentOptions>({ classes: [], periods: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(
      Promise.all([
        fetchAssignments({
          classId: classFilter === 'all' ? undefined : classFilter,
          periodId: periodFilter === 'all' ? undefined : periodFilter,
        }),
        fetchTeacherLoads(),
        fetchAssignmentOptions(),
      ]),
      LOAD_TIMEOUT_MS,
      'Lecture Supabase trop longue',
    )
      .then(([nextRows, nextLoads, nextOptions]) => {
        if (!mounted) return
        setRows(nextRows)
        setLoads(nextLoads)
        setOptions(nextOptions)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile, classFilter, periodFilter])

  if (auth.loading || loading) return <AssignmentsSkeleton />

  if (!auth.profile) {
    return (
      <BareAssignmentsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les affectations."
      />
    )
  }

  if (!['admin', 'ddfpt', 'principal', 'superadmin'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Affectations" subtitle="Donnees Supabase">
        <EmptyState
          icon={<Network className="w-5 h-5" />}
          title="Acces non autorise"
          description="Cette page est reservee aux roles de pilotage de l'etablissement."
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Affectations" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les affectations"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Affectations"
      subtitle={`${rows.length} eleves visibles - donnees Supabase - seuil charge a ${TEACHER_LOAD_THRESHOLD}`}
    >
      <AssignmentsContent
        rows={rows}
        loads={loads}
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        options={options}
        canMutate={false}
      />
    </AppLayout>
  )
}

function AssignmentsDemo() {
  const [classFilter, setClassFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>(pfmpPeriods[1]?.id || 'all')
  const rows = useMemo(
    () =>
      students.filter((student) => {
        if (classFilter !== 'all' && student.classId !== classFilter) return false
        if (periodFilter !== 'all' && student.periodId !== periodFilter) return false
        return true
      }),
    [classFilter, periodFilter],
  )

  return (
    <AppLayout
      title="Affectations"
      subtitle="Eleves - professeurs referents - seuil charge a 6 - mode demo"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <AssignmentsHeader
              classFilter={classFilter}
              setClassFilter={setClassFilter}
              periodFilter={periodFilter}
              setPeriodFilter={setPeriodFilter}
              classes={classes.map((klass) => ({ id: klass.id, name: klass.name }))}
              periods={pfmpPeriods.map((period) => ({ id: period.id, name: period.name }))}
            />
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {rows.map((student) => {
                const ref = teachers.find((teacher) => teacher.id === student.referentId)
                const company = companies.find((company) => company.id === student.companyId)
                return (
                  <li key={student.id} className="flex items-center gap-3 px-5 py-3">
                    <StudentLine
                      name={`${student.firstName} ${student.lastName}`}
                      className={classes.find((klass) => klass.id === student.classId)?.name ?? '-'}
                      companyName={company?.name ?? null}
                    />
                    <StageStatusBadge status={student.stageStatus} />
                    <Badge tone={ref ? 'brand' : 'warning'}>
                      {ref ? `${ref.firstName} ${ref.lastName}` : 'Non affecte'}
                    </Badge>
                    <Button size="sm" variant="secondary">Affecter</Button>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>

        <TeacherLoadsDemo />
      </div>
    </AppLayout>
  )
}

function AssignmentsContent({
  rows,
  loads,
  classFilter,
  setClassFilter,
  periodFilter,
  setPeriodFilter,
  options,
  canMutate,
}: {
  rows: AssignmentListItem[]
  loads: TeacherLoadItem[]
  classFilter: string
  setClassFilter: (value: string) => void
  periodFilter: string
  setPeriodFilter: (value: string) => void
  options: AssignmentOptions
  canMutate: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <AssignmentsHeader
            classFilter={classFilter}
            setClassFilter={setClassFilter}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            classes={options.classes}
            periods={options.periods}
          />
        </CardHeader>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Network className="w-5 h-5" />}
              title="Aucune affectation visible"
              description="Aucun eleve ne correspond aux filtres actuels ou aucune donnee n'existe encore dans ce tenant."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {rows.map((row) => (
                <li key={row.student.id} className="flex items-center gap-3 px-5 py-3">
                  <StudentLine
                    name={`${row.student.first_name} ${row.student.last_name}`}
                    className={row.class?.name ?? '-'}
                    companyName={row.company?.name ?? null}
                  />
                  <StageStatusBadge status={row.placement?.status ?? 'no_stage'} />
                  <Badge tone={row.referent ? 'brand' : 'warning'}>
                    {row.referent
                      ? `${row.referent.first_name} ${row.referent.last_name}`
                      : 'Non affecte'}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={!canMutate}>
                    Affecter
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <TeacherLoads loads={loads} />
    </div>
  )
}

function AssignmentsHeader({
  classFilter,
  setClassFilter,
  periodFilter,
  setPeriodFilter,
  classes: classOptions,
  periods,
}: {
  classFilter: string
  setClassFilter: (value: string) => void
  periodFilter: string
  setPeriodFilter: (value: string) => void
  classes: Array<{ id: string; name: string }>
  periods: Array<{ id: string; name: string }>
}) {
  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'
  return (
    <>
      <div>
        <CardTitle icon={<Network className="w-4 h-4" />}>Eleves</CardTitle>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Les affectations referent seront modifiables dans le sprint parcours metier.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={filterSelect}>
          <option value="all">Toutes classes</option>
          {classOptions.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className={filterSelect}>
          <option value="all">Toutes periodes</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

function StudentLine({
  name,
  className,
  companyName,
}: {
  name: string
  className: string
  companyName: string | null
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{name}</p>
      <p className="text-xs text-[var(--color-text-muted)] truncate">
        {className}
        {companyName ? ` - ${companyName}` : ' - Pas d\'entreprise'}
      </p>
    </div>
  )
}

function TeacherLoads({ loads }: { loads: TeacherLoadItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Charge des professeurs</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {loads.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Aucun professeur enregistre.</p>
        ) : (
          loads.map((item) => (
            <div key={item.teacher.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium truncate">
                {item.teacher.first_name} {item.teacher.last_name}
              </span>
              <TeacherLoadIndicator load={item.studentLoad} threshold={TEACHER_LOAD_THRESHOLD} />
            </div>
          ))
        )}
        <p className="text-xs text-[var(--color-text-muted)] pt-2">
          Le seuil par professeur est configurable dans les parametres etablissement.
        </p>
      </CardBody>
    </Card>
  )
}

function TeacherLoadsDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Charge des professeurs</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium truncate">
              {teacher.firstName} {teacher.lastName}
            </span>
            <TeacherLoadIndicator load={teacher.studentLoad} threshold={TEACHER_LOAD_THRESHOLD} />
          </div>
        ))}
        <p className="text-xs text-[var(--color-text-muted)] pt-2">
          Le seuil par professeur est configurable dans les parametres etablissement.
        </p>
      </CardBody>
    </Card>
  )
}

function AssignmentsSkeleton() {
  return (
    <AppLayout title="Affectations" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </div>
    </AppLayout>
  )
}

function BareAssignmentsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Network className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
