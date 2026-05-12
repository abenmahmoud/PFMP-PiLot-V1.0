import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { InviteUserForm } from '@/components/InviteUserForm'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { UserActionsMenu } from '@/components/users/UserActionsMenu'
import { UserStatusBadge } from '@/components/users/UserStatusBadge'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import type { UserRole } from '@/lib/database.types'
import {
  listUsersForTenant,
  type UserRowEnriched,
  type UserStatusFilter,
} from '@/server/users.functions'
import { ROLE_LABELS } from '@/types'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
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

const STATUS_FILTERS: Array<{ value: UserStatusFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'confirmed', label: 'Confirmes' },
  { value: 'pending', label: 'En attente' },
  { value: 'archived', label: 'Archives' },
]

function AdminUsersPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Utilisateurs" subtitle="Mode demo">
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Gestion utilisateurs indisponible en mode demo"
          description="Les invitations et comptes reels sont disponibles avec Supabase Auth."
        />
      </AppLayout>
    )
  }

  return <AdminUsersSupabase />
}

function AdminUsersSupabase() {
  const auth = useAuth()
  const [users, setUsers] = useState<UserRowEnriched[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scope = auth.establishmentId ?? auth.activeEstablishmentId
  const canInvite = auth.profile?.role === 'superadmin' || auth.profile?.role === 'admin'

  function reloadUsers() {
    if (!scope || !auth.session?.access_token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    listUsersForTenant({
      data: {
        accessToken: auth.session.access_token,
        establishmentId: scope,
        status,
      },
    })
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile || !scope) {
      setLoading(false)
      return
    }
    reloadUsers()
  }, [auth.loading, auth.profile, scope, status])

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return users
    return users.filter((user) =>
      `${user.first_name} ${user.last_name} ${user.email} ${user.role} ${user.establishment_name ?? ''}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [search, users])

  if (auth.loading || loading) {
    return (
      <AppLayout title="Utilisateurs" subtitle="Gestion des comptes et invitations">
        <EmptyState title="Chargement des utilisateurs" description="Lecture des profils du tenant." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Utilisateurs" subtitle="Gestion des comptes et invitations">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session requise"
          description="Connectez-vous pour gerer les utilisateurs."
          action={
            <Link to="/login">
              <Button>Connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (!['superadmin', 'admin', 'ddfpt'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Utilisateurs" subtitle="Gestion des comptes et invitations">
        <EmptyState
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Acces reserve"
          description="Seuls les superadmins, admins et DDFPT peuvent afficher les utilisateurs."
        />
      </AppLayout>
    )
  }

  if (!scope) {
    return (
      <AppLayout title="Utilisateurs" subtitle="Gestion des comptes et invitations">
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Choisissez un etablissement"
          description="En superadmin, selectionnez un tenant actif avant de gerer ses utilisateurs."
          action={
            <Link to="/superadmin/establishments">
              <Button>Choisir un etablissement</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  const profile = auth.profile
  const accessToken = auth.session?.access_token ?? ''

  return (
    <AppLayout
      title="Utilisateurs"
      subtitle="Invitations, statuts et comptes du tenant"
      actions={
        <Badge tone="neutral">
          {users.length} utilisateur{users.length > 1 ? 's' : ''}
        </Badge>
      }
    >
      <div className={canInvite ? 'grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4' : 'space-y-4'}>
        <section className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
            <SearchFilterBar
              query={search}
              onQueryChange={setSearch}
              placeholder="Rechercher par nom, email, role..."
            />
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
              title={status === 'archived' ? 'Aucun utilisateur archive' : 'Aucun utilisateur'}
              description={
                status === 'archived'
                  ? 'Les comptes archives apparaitront ici pour restauration ou suppression definitive.'
                  : 'Invitez le premier admin, DDFPT ou referent pour demarrer le tenant.'
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  callerRole={profile.role}
                  callerId={profile.id}
                  callerEstablishmentId={auth.establishmentId}
                  accessToken={accessToken}
                  onActionComplete={reloadUsers}
                />
              ))}
            </div>
          )}
        </section>

        {canInvite && (
          <aside>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle icon={<UserPlus className="w-4 h-4" />}>Inviter un utilisateur</CardTitle>
                  <CardDescription>
                    L'utilisateur recevra un lien email et definira son mot de passe.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                <InviteUserForm
                  establishmentId={scope}
                  allowedRoles={
                    auth.profile.role === 'superadmin'
                      ? ['admin', 'ddfpt', 'principal', 'referent', 'eleve']
                      : ['principal', 'referent', 'eleve']
                  }
                  defaultRole={auth.profile.role === 'superadmin' ? 'admin' : 'referent'}
                  compact
                  onInvited={reloadUsers}
                />
              </CardBody>
            </Card>
          </aside>
        )}
      </div>
    </AppLayout>
  )
}

function UserRow({
  user,
  callerRole,
  callerId,
  callerEstablishmentId,
  accessToken,
  onActionComplete,
}: {
  user: UserRowEnriched
  callerRole: UserRole
  callerId: string
  callerEstablishmentId: string | null
  accessToken: string
  onActionComplete: () => void
}) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 lg:items-center">
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-text)] truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>
            <p className="text-xs text-[var(--color-text-subtle)]">
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
              maj {formatDate(user.updated_at)}
            </span>
          </div>
          <UserActionsMenu
            user={user}
            callerRole={callerRole}
            callerId={callerId}
            callerEstablishmentId={callerEstablishmentId}
            accessToken={accessToken}
            onActionComplete={onActionComplete}
          />
        </div>
      </CardBody>
    </Card>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}
