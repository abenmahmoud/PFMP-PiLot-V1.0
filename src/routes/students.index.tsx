import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { DataTable } from '@/components/DataTable'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { Button } from '@/components/ui/Button'
import { StageStatusBadge } from '@/components/StatusBadge'
import { classes, companies, students, teachers } from '@/data/demo'

export const Route = createFileRoute('/students/')({ component: StudentsPage })

function StudentsPage() {
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
      title="Élèves"
      subtitle={`${students.length} élèves · vue établissement`}
      actions={<Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>Ajouter</Button>}
    >
      <SearchFilterBar
        query={q}
        onQueryChange={setQ}
        placeholder="Rechercher un élève, une formation…"
        filters={
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className={filterSelect}
          >
            <option value="all">Tous les statuts</option>
            <option value="no_stage">Pas de stage</option>
            <option value="found">Stage trouvé</option>
            <option value="pending_convention">Convention en attente</option>
            <option value="signed_convention">Convention signée</option>
            <option value="in_progress">En stage</option>
            <option value="completed">Terminé</option>
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
            render: (s) => companies.find((c) => c.id === s.companyId)?.name || '—',
          },
          {
            key: 'ref',
            header: 'Référent',
            hideOnMobile: true,
            render: (s) => {
              const t = teachers.find((t) => t.id === s.referentId)
              return t ? `${t.firstName} ${t.lastName}` : '—'
            },
          },
          { key: 'status', header: 'Statut', render: (s) => <StageStatusBadge status={s.stageStatus} /> },
        ]}
      />
    </AppLayout>
  )
}
