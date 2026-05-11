import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Plus, Power } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { DataTable } from '@/components/DataTable'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchEstablishmentsList,
  type EstablishmentListItem,
} from '@/services/superadmin'
import { establishments as demoEstablishments } from '@/data/demo'

export const Route = createFileRoute('/superadmin/establishments')({
  component: EstablishmentsPage,
})

const LIST_LOAD_TIMEOUT_MS = 12000
const AUTH_LOAD_TIMEOUT_MS = 8000

// --------------------------------------------------------------------------
// Routeur demo / Supabase
// --------------------------------------------------------------------------

function EstablishmentsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname !== '/superadmin/establishments') {
    return <Outlet />
  }

  if (isDemoMode()) {
    return (
      <AppLayout
        title="Établissements"
        subtitle="Vue Superadmin · gestion multi-tenant · démo"
        actions={
          <Button iconLeft={<Plus className="w-4 h-4" />} size="sm">
            Nouvel établissement
          </Button>
        }
      >
        <RoleGuard allow={['superadmin']}>
          <EstablishmentsDemoContent />
        </RoleGuard>
      </AppLayout>
    )
  }
  return <EstablishmentsSupabase />
}

// --------------------------------------------------------------------------
// Mode Supabase (prod)
// --------------------------------------------------------------------------

function EstablishmentsSupabase() {
  const auth = useAuth()
  const [items, setItems] = useState<EstablishmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!auth.loading) {
      setAuthTimedOut(false)
      return
    }
    const t = window.setTimeout(() => setAuthTimedOut(true), AUTH_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [auth.loading])

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(fetchEstablishmentsList(), LIST_LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((next) => {
        if (mounted) setItems(next)
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
  }, [auth.loading, auth.profile])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) => {
      const e = item.establishment
      return (
        e.name.toLowerCase().includes(normalized) ||
        (e.city ?? '').toLowerCase().includes(normalized) ||
        (e.uai ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [items, query])

  const layoutProps = {
    title: 'Établissements',
    subtitle: 'Vue Superadmin · gestion multi-tenant · données Supabase',
    actions: (
      <Link to="/superadmin/establishments/new">
        <Button iconLeft={<Plus className="w-4 h-4" />} size="sm">
          Nouvel établissement
        </Button>
      </Link>
    ),
  }

  if (auth.loading && !authTimedOut) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState title="Chargement de la liste" description="Lecture des données Supabase..." />
      </AppLayout>
    )
  }

  if (auth.loading && authTimedOut) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session en attente"
          description="La session Supabase met trop longtemps à se résoudre. Rechargez la page."
          action={
            <Link to="/login">
              <Button>Retour à la connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState
          title="Session requise"
          description="Connectez-vous avec un compte Supabase pour afficher la liste."
          action={
            <Link to="/login">
              <Button>Retour à la connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.role !== 'superadmin') {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Accès réservé aux superadmins"
          description="Votre rôle actuel ne permet pas de gérer les établissements."
        />
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState title="Chargement de la liste" description="Lecture des données Supabase..." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les établissements"
          description={error}
        />
      </AppLayout>
    )
  }

  if (items.length === 0) {
    return (
      <AppLayout {...layoutProps}>
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucun établissement enregistré"
          description="Créez votre premier établissement pour démarrer le pilotage des PFMP."
          action={
            <Link to="/superadmin/establishments/new">
              <Button iconLeft={<Plus className="w-4 h-4" />}>Créer un établissement</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout {...layoutProps}>
      <RoleGuard allow={['superadmin']}>
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Rechercher un établissement, une ville…"
        />
        {filtered.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description="Modifiez votre recherche pour afficher d'autres établissements."
          />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(r) => r.establishment.id}
            columns={[
              {
                key: 'name',
                header: 'Établissement',
                render: (r) => {
                  const e = r.establishment
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{e.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {e.city ?? '—'}
                          {e.uai ? ` · UAI ${e.uai}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                },
              },
              {
                key: 'students',
                header: 'Élèves',
                align: 'right',
                hideOnMobile: true,
                render: (r) => r.studentCount,
              },
              {
                key: 'users',
                header: 'Utilisateurs',
                align: 'right',
                hideOnMobile: true,
                render: (r) => r.userCount,
              },
              {
                key: 'last',
                header: 'Dernière connexion',
                hideOnMobile: true,
                render: (r) =>
                  r.lastConnectionAt ? (
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {new Date(r.lastConnectionAt).toLocaleDateString('fr-FR')}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'score',
                header: 'Activité',
                render: (r) => {
                  const tone =
                    r.activityScore >= 70
                      ? 'success'
                      : r.activityScore >= 40
                        ? 'warning'
                        : 'danger'
                  return (
                    <Badge tone={tone} dot>
                      {r.activityScore}/100
                    </Badge>
                  )
                },
              },
              {
                key: 'status',
                header: 'Statut',
                render: (r) => (
                  <Badge tone={r.establishment.active ? 'success' : 'neutral'} dot>
                    {r.establishment.active ? 'Actif' : 'Inactif'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={<Power className="w-3.5 h-3.5" />}
                    >
                      {r.establishment.active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Link
                      to="/superadmin/establishments/$id"
                      params={{ id: r.establishment.id }}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-muted)]"
                    >
                      Voir détail
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        )}
      </RoleGuard>
    </AppLayout>
  )
}

// --------------------------------------------------------------------------
// Mode démo (legacy)
// --------------------------------------------------------------------------

function EstablishmentsDemoContent() {
  const [q, setQ] = useState('')
  const rows = demoEstablishments.filter(
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
              const tone =
                e.activityScore >= 70 ? 'success' : e.activityScore >= 40 ? 'warning' : 'danger'
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
                <Link
                  to="/superadmin/establishments/$id"
                  params={{ id: e.id }}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-muted)]"
                >
                  Voir détail
                </Link>
              </div>
            ),
          },
        ]}
      />
    </>
  )
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ])
}
