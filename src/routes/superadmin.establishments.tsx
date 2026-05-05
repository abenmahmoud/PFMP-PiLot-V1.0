import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Plus, Power } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { DataTable } from '@/components/DataTable'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { establishments } from '@/data/demo'

export const Route = createFileRoute('/superadmin/establishments')({ component: EstablishmentsPage })

function EstablishmentsPage() {
  return (
    <AppLayout
      title="Établissements"
      subtitle="Vue Superadmin · gestion multi-tenant"
      actions={
        <Button iconLeft={<Plus className="w-4 h-4" />} size="sm">
          Nouvel établissement
        </Button>
      }
    >
      <RoleGuard allow={['superadmin']}>
        <Inner />
      </RoleGuard>
    </AppLayout>
  )
}

function Inner() {
  const [q, setQ] = useState('')
  const rows = establishments.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.city.toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <>
      <SearchFilterBar
        query={q}
        onQueryChange={setQ}
        placeholder="Rechercher un établissement, une ville…"
      />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Établissement',
            render: (e) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {e.city}
                    {e.uai ? ` · UAI ${e.uai}` : ''}
                  </p>
                </div>
              </div>
            ),
          },
          { key: 'students', header: 'Élèves', align: 'right', render: (e) => e.studentCount, hideOnMobile: true },
          { key: 'users', header: 'Utilisateurs', align: 'right', render: (e) => e.userCount, hideOnMobile: true },
          {
            key: 'last',
            header: 'Dernière connexion',
            hideOnMobile: true,
            render: (e) =>
              e.lastConnectionAt ? (
                <span className="text-sm text-[var(--color-text-muted)]">
                  {new Date(e.lastConnectionAt).toLocaleDateString('fr-FR')}
                </span>
              ) : (
                '—'
              ),
          },
          {
            key: 'score',
            header: 'Activité',
            render: (e) => {
              const tone = e.activityScore >= 70 ? 'success' : e.activityScore >= 40 ? 'warning' : 'danger'
              return (
                <Badge tone={tone} dot>
                  {e.activityScore}/100
                </Badge>
              )
            },
          },
          {
            key: 'status',
            header: 'Statut',
            render: (e) => (
              <Badge tone={e.active ? 'success' : 'neutral'} dot>
                {e.active ? 'Actif' : 'Inactif'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (e) => (
              <div className="flex items-center gap-1 justify-end">
                <Button size="sm" variant="ghost" iconLeft={<Power className="w-3.5 h-3.5" />}>
                  {e.active ? 'Désactiver' : 'Activer'}
                </Button>
                <Button size="sm" variant="secondary">
                  Voir détail
                </Button>
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
