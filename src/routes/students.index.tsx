import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { DataTable } from '@/components/DataTable'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { StageStatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchStudents,
  type StudentListItem,
} from '@/services/students'
import type { StageStatus } from '@/lib/database.types'
import { classes, companies, students, teachers } from '@/data/demo'

export const Route = createFileRoute('/students/')({ component: StudentsPage })

const STAGE_FILTERS: Array<{ value: 'all' | StageStatus; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'no_stage', label: 'Pas de stage' },
  { value: 'found', label: 'Stage trouve' },
  { value: 'pending_convention', label: 'Convention en attente' },
  { value: 'signed_convention', label: 'Convention signee' },
  { value: 'in_progress', label: 'En stage' },
  { value: 'completed', label: 'Termine' },
  { value: 'interrupted', label: 'Interrompu' },
]

function StudentsPage() {
  if (isDemoMode()) return <StudentsDemo />
  return <StudentsSupabase />
}

function StudentsSupabase() {
  const auth = useAuth()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<'all' | StageStatus>('all')
  const [classId, setClassId] = useState('all')
  const [referentId, setReferentId] = useState('all')
  const [rows, setRows] = useState<StudentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    fetchStudents({
      classId: classId === 'all' ? undefined : classId,
      stageStatus: stage === 'all' ? undefined : stage,
      referentId: referentId === 'all' ? undefined : referentId,
    }, auth.profile)
      .then((nextRows) => {
        if (mounted) setRows(nextRows)
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
  }, [auth.loading, auth.profile, classId, stage, referentId])

  const classOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of rows) {
      if (row.class) byId.set(row.class.id, row.class.name)
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const referentOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of rows) {
      if (row.referent) byId.set(row.referent.id, `${row.referent.first_name} ${row.referent.last_name}`)
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const visibleRows = useMemo(() => {
    const normalized = q.trim().toLowerCase()
    if (!normalized) return rows
    return rows.filter((row) => {
      const student = row.student
      return [
        student.first_name,
        student.last_name,
        student.email,
        student.formation,
        row.class?.name,
        row.company?.name,
        row.referent ? `${row.referent.first_name} ${row.referent.last_name}` : null,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    })
  }, [q, rows])

  if (auth.loading || loading) return <StudentsSkeleton />

  if (!auth.profile) {
    return (
      <BareStudentsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les eleves reels."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Eleves" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les eleves"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Eleves"
      subtitle={`${visibleRows.length} eleves visibles - donnees Supabase`}
      actions={
        <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} disabled>
          Ajouter
        </Button>
      }
    >
      <SearchFilterBar
        query={q}
        onQueryChange={setQ}
        placeholder="Rechercher un eleve, une formation, une entreprise..."
        filters={
          <>
            <select value={stage} onChange={(e) => setStage(e.target.value as 'all' | StageStatus)} className={filterSelect}>
              {STAGE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={filterSelect}>
              <option value="all">Toutes les classes</option>
              {classOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select value={referentId} onChange={(e) => setReferentId(e.target.value)} className={filterSelect}>
              <option value="all">Tous les referents</option>
              {referentOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <DataTable
        rows={visibleRows}
        rowKey={(row) => row.student.id}
        empty={
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="Aucun eleve"
            description="Aucun eleve ne correspond aux filtres actuels dans ce tenant."
          />
        }
        columns={[
          {
            key: 'name',
            header: 'Nom',
            render: (row) => (
              <Link
                to="/students/$id"
                params={{ id: row.student.id }}
                className="font-medium hover:text-[var(--color-brand-700)]"
              >
                {row.student.first_name} {row.student.last_name}
              </Link>
            ),
          },
          {
            key: 'class',
            header: 'Classe',
            hideOnMobile: true,
            render: (row) => row.class?.name ?? '-',
          },
          {
            key: 'formation',
            header: 'Formation',
            hideOnMobile: true,
            render: (row) => row.student.formation ?? row.class?.formation ?? '-',
          },
          {
            key: 'company',
            header: 'Entreprise',
            hideOnMobile: true,
            render: (row) => row.company?.name ?? '-',
          },
          {
            key: 'ref',
            header: 'Referent',
            hideOnMobile: true,
            render: (row) =>
              row.referent ? `${row.referent.first_name} ${row.referent.last_name}` : '-',
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => <StageStatusBadge status={row.stageStatus} />,
          },
        ]}
      />
    </AppLayout>
  )
}

function StudentsDemo() {
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<string>('all')
  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'

  const rows = students.filter((s) => {
    if (stage !== 'all' && s.stageStatus !== stage) return false
    if (!q) return true
    const ql = q.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(ql) ||
      s.lastName.toLowerCase().includes(ql) ||
      s.formation.toLowerCase().includes(ql)
    )
  })

  return (
    <AppLayout
      title="Eleves"
      subtitle={`${students.length} eleves - vue etablissement`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Ajouter</Button>}
    >
      <SearchFilterBar
        query={q}
        onQueryChange={setQ}
        placeholder="Rechercher un eleve, une formation..."
        filters={
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className={filterSelect}
          >
            <option value="all">Tous les statuts</option>
            <option value="no_stage">Pas de stage</option>
            <option value="found">Stage trouve</option>
            <option value="pending_convention">Convention en attente</option>
            <option value="signed_convention">Convention signee</option>
            <option value="in_progress">En stage</option>
            <option value="completed">Termine</option>
            <option value="interrupted">Interrompu</option>
          </select>
        }
      />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            render: (s) => (
              <Link
                to="/students/$id"
                params={{ id: s.id }}
                className="font-medium hover:text-[var(--color-brand-700)]"
              >
                {s.firstName} {s.lastName}
              </Link>
            ),
          },
          {
            key: 'class',
            header: 'Classe',
            hideOnMobile: true,
            render: (s) => classes.find((c) => c.id === s.classId)?.name,
          },
          { key: 'formation', header: 'Formation', hideOnMobile: true, render: (s) => s.formation },
          {
            key: 'company',
            header: 'Entreprise',
            hideOnMobile: true,
            render: (s) => companies.find((c) => c.id === s.companyId)?.name || '-',
          },
          {
            key: 'ref',
            header: 'Referent',
            hideOnMobile: true,
            render: (s) => {
              const t = teachers.find((t) => t.id === s.referentId)
              return t ? `${t.firstName} ${t.lastName}` : '-'
            },
          },
          { key: 'status', header: 'Statut', render: (s) => <StageStatusBadge status={s.stageStatus} /> },
        ]}
      />
    </AppLayout>
  )
}

function StudentsSkeleton() {
  return (
    <BareStudentsState
      title="Chargement des eleves"
      description="Lecture des donnees Supabase..."
    />
  )
}

function BareStudentsState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-3 rounded-full bg-[var(--color-muted)] animate-pulse"
            />
          ))}
        </div>
        <h1 className="text-base font-semibold text-[var(--color-text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
    </div>
  )
}
