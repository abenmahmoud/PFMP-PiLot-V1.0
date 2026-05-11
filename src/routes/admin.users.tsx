import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { InviteUserForm } from '@/components/InviteUserForm'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import type { ProfileRow, UserRole } from '@/lib/database.types'
import { fetchTenantUsers } from '@/services/tenantUsers'
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
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scope = auth.establishmentId ?? auth.activeEstablishmentId

  function reloadUsers() {
    if (!scope) return
    setLoading(true)
    setError(null)
    fetchTenantUsers(scope)
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
  }, [auth.loading, auth.profile, scope])

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return users
    return users.filter((user) =>
      `${user.first_name} ${user.last_name} ${user.email} ${user.role}`
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
          description="Seuls les superadmins, admins et DDFPT peuvent inviter des utilisateurs."
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

  return (
    <AppLayout
      title="Utilisateurs"
      subtitle="Invitations et comptes du tenant"
      actions={
        <Badge tone="neutral">
          {users.length} utilisateur{users.length > 1 ? 's' : ''}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <section className="space-y-4">
          <SearchFilterBar
            query={search}
            onQueryChange={setSearch}
            placeholder="Rechercher par nom, email ou role..."
          />

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
              description="Invitez le premier admin, DDFPT ou referent pour demarrer le tenant."
            />
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
          )}
        </section>

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
      </div>
    </AppLayout>
  )
}

function UserRow({ user }: { user: ProfileRow }) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-text)] truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
            <span className="text-xs text-[var(--color-text-muted)]">
              maj {new Date(user.updated_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
