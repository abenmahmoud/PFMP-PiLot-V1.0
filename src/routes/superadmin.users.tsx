import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldCheck, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { UserActionsMenu } from '@/components/users/UserActionsMenu'
import { UserStatusBadge } from '@/components/users/UserStatusBadge'
import type { UserEstablishmentOption } from '@/components/users/ChangeUserEstablishmentModal'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { ROLE_LABELS } from '@/lib/permissions'
import { isDemoMode } from '@/lib/supabase'
import type { UserRole } from '@/lib/database.types'
import {
  listAllUsers,
  type UserRowEnriched,
  type UserStatusFilter,
} from '@/server/users.functions'
import { fetchEstablishmentsList } from '@/services/superadmin'

export const Route = createFileRoute('/superadmin/users')({
  component: SuperadminUsersPage,
})

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  superadmin: 'brand',
  admin: 'info',
  ddfpt: 'info',
  principal: 'success',
  referent: 'success',
  tuteur: 'warning',
  eleve: 'neutral',
}

const ROLE_FILTERS: Array<UserRole | 'all'> = [
  'all',
  'superadmin',
  'admin',
  'ddfpt',
  'principal',
  'referent',
  'tuteur',
  'eleve',
]

const STATUS_FILTERS: Array<{ value: UserStatusFilter; label: string }> = [
  { value: 'all', label: 'Tous actifs' },
  { value: 'confirmed', label: 'Confirmes' },
  { value: 'pending', label: 'En attente' },
  { value: 'archived', label: 'Archives' },
]

function SuperadminUsersPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Utilisateurs globaux" subtitle="Mode demo">
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Vue utilisateurs indisponible en mode demo"
          description="La liste cross-tenant depend de Supabase Auth."
        />
      </AppLayout>
    )
  }

  return <SuperadminUsersSupabase />
}

function SuperadminUsersSupabase() {
  const auth = useAuth()
  const [users, setUsers] = useState<UserRowEnriched[]>([])
  const [archivedUsers, setArchivedUsers] = useState<UserRowEnriched[]>([])
  const [establishments, setEstablishments] = useState<UserEstablishmentOption[]>([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [establishmentId, setEstablishmentId] = useState<string | 'all'>('all')
  const [status, setStatus] = useState<UserStatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function reloadUsers() {
    if (!auth.session?.access_token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    Promise.all([
      listAllUsers({
        data: {
          accessToken: auth.session.access_token,
          filters: { role, establishmentId, status },
        },
      }),
      listAllUsers({
        data: {
          accessToken: auth.session.access_token,
          filters: { role: 'all', establishmentId: 'all', status: 'archived' },
        },
      }),
      fetchEstablishmentsList(),
    ])
      .then(([nextUsers, nextArchived, nextEstablishments]) => {
        setUsers(nextUsers)
        setArchivedUsers(nextArchived)
        setEstablishments(
          nextEstablishments.map((item) => ({
            id: item.establishment.id,
            name: item.establishment.name,
          })),
        )
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }
    reloadUsers()
  }, [auth.loading, auth.profile, role, establishmentId, status])

  const filteredUsers = useMemo(() => filterBySearch(users, search), [users, search])
  const filteredArchivedUsers = useMemo(
    () => filterBySearch(archivedUsers, search),
    [archivedUsers, search],
  )

  if (auth.loading || loading) {
    return (
      <AppLayout title="Utilisateurs globaux" subtitle="Vue Superadmin">
        <EmptyState title="Chargement des utilisateurs" description="Lecture Supabase Auth et profiles." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Utilisateurs globaux" subtitle="Vue Superadmin">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session requise"
          description="Connectez-vous en superadmin."
          action={
            <Link to="/login">
              <Button>Connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.profile.role !== 'superadmin') {
    return (
      <AppLayout title="Utilisateurs globaux" subtitle="Vue Superadmin">
        <EmptyState
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Acces reserve aux superadmins"
          description="Cette vue affiche les comptes de tous les tenants."
        />
      </AppLayout>
    )
  }

  const profile = auth.profile
  const accessToken = auth.session?.access_token ?? ''

  return (
    <AppLayout
      title="Utilisateurs globaux"
      subtitle="Gestion cross-tenant des comptes et invitations"
      actions={<Badge tone="neutral">{users.length} comptes</Badge>}
    >
      <div className="space-y-5">
        <Card>
          <CardBody className="pt-5 space-y-3">
            <SearchFilterBar
              query={search}
              onQueryChange={setSearch}
              placeholder="Rechercher par nom, email, role, etablissement..."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <select
                className="h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole | 'all')}
              >
                {ROLE_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Tous les roles' : ROLE_LABELS[item]}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
                value={establishmentId}
                onChange={(event) => setEstablishmentId(event.target.value)}
              >
                <option value="all">Tous les etablissements</option>
                {establishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={status === item.value ? 'primary' : 'secondary'}
                    onClick={() => setStatus(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {error && (
          <EmptyState
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Impossible de charger les utilisateurs"
            description={error}
          />
        )}

        {!error && filteredUsers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="Aucun utilisateur"
            description="Aucun compte ne correspond aux filtres selectionnes."
          />
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <GlobalUserRow
                key={user.id}
                user={user}
                accessToken={accessToken}
                callerId={profile.id}
                establishments={establishments}
                onActionComplete={reloadUsers}
              />
            ))}
          </div>
        )}

        <Card className="border-red-100">
          <CardHeader>
            <div>
              <CardTitle icon={<AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />}>
                Danger zone
              </CardTitle>
              <CardDescription>
                Comptes archives. Restaurer si erreur, supprimer definitivement uniquement si necessaire.
              </CardDescription>
            </div>
            <Badge tone="neutral">{filteredArchivedUsers.length}</Badge>
          </CardHeader>
          <CardBody className="space-y-2">
            {filteredArchivedUsers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Aucun compte archive.</p>
            ) : (
              filteredArchivedUsers.map((user) => (
                <GlobalUserRow
                  key={user.id}
                  user={user}
                  accessToken={accessToken}
                  callerId={profile.id}
                  establishments={establishments}
                  onActionComplete={reloadUsers}
                />
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function GlobalUserRow({
  user,
  accessToken,
  callerId,
  establishments,
  onActionComplete,
}: {
  user: UserRowEnriched
  accessToken: string
  callerId: string
  establishments: UserEstablishmentOption[]
  onActionComplete: () => void
}) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-3 xl:items-center">
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-text)] truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>
            <p className="text-xs text-[var(--color-text-subtle)] truncate">
              {user.establishment_id ? (
                <Link
                  to="/superadmin/establishments/$id"
                  params={{ id: user.establishment_id }}
                  className="hover:text-[var(--color-brand-700)]"
                >
                  {user.establishment_name ?? user.establishment_id}
                </Link>
              ) : (
                'Aucun tenant'
              )}
              {' · '}
              Derniere connexion : {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '-'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
            <UserStatusBadge
              emailConfirmedAt={user.email_confirmed_at}
              archivedAt={user.archived_at}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              cree {formatDate(user.created_at)}
            </span>
          </div>
          <UserActionsMenu
            user={user}
            callerRole="superadmin"
            callerId={callerId}
            callerEstablishmentId={null}
            accessToken={accessToken}
            establishments={establishments}
            onActionComplete={onActionComplete}
          />
        </div>
      </CardBody>
    </Card>
  )
}

function filterBySearch(users: UserRowEnriched[], search: string): UserRowEnriched[] {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return users
  return users.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email} ${user.role} ${user.establishment_name ?? ''}`
      .toLowerCase()
      .includes(normalized),
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}
