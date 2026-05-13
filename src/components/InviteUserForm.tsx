import { useEffect, useMemo, useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { FieldHint, Input, Label, Select } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { getInvitableRoles, ROLE_LABELS } from '@/lib/permissions'
import {
  inviteUserToEstablishment,
  type InviteUserRole,
} from '@/server/invitations.functions'

interface InviteUserFormProps {
  establishmentId: string
  allowedRoles: InviteUserRole[]
  defaultRole?: InviteUserRole
  compact?: boolean
  onInvited?: () => void
}

export function InviteUserForm({
  establishmentId,
  allowedRoles,
  defaultRole = allowedRoles[0],
  compact = false,
  onInvited,
}: InviteUserFormProps) {
  const auth = useAuth()
  const effectiveRoles = useMemo(() => {
    const callerRole = auth.profile?.role ?? 'eleve'
    const invitable = getInvitableRoles(callerRole)
    return allowedRoles.filter((item) => invitable.includes(item))
  }, [allowedRoles, auth.profile?.role])
  const fallbackRole = getFallbackRole(effectiveRoles, defaultRole)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteUserRole>(fallbackRole ?? 'eleve')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!fallbackRole) return
    if (!effectiveRoles.includes(role)) setRole(fallbackRole)
  }, [effectiveRoles, fallbackRole, role])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!auth.session?.access_token) {
      setError('Session introuvable. Reconnectez-vous.')
      return
    }
    if (!effectiveRoles.includes(role)) {
      setError('Role non autorise dans ce contexte.')
      return
    }

    setSubmitting(true)
    try {
      const result = await inviteUserToEstablishment({
        data: {
          accessToken: auth.session.access_token,
          establishmentId,
          email,
          firstName,
          lastName,
          role,
        },
      })
      setSuccess(`Invitation envoyee a ${result.email}.`)
      setFirstName('')
      setLastName('')
      setEmail('')
      if (fallbackRole) setRole(fallbackRole)
      onInvited?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (effectiveRoles.length === 0) {
    return (
      <EmptyState
        title="Invitation non autorisee"
        description="Votre role ne permet pas d'inviter de nouveaux utilisateurs."
        className="py-8"
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        <div>
          <Label htmlFor="invite-first-name">Prenom</Label>
          <Input
            id="invite-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Camille"
            required
          />
        </div>
        <div>
          <Label htmlFor="invite-last-name">Nom</Label>
          <Input
            id="invite-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Lefevre"
            required
          />
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom.nom@ac-academie.fr"
            required
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as InviteUserRole)}
          >
            {effectiveRoles.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <FieldHint>
        Le lien d'invitation est envoye par Supabase Auth. Le mot de passe sera defini
        par l'utilisateur sur la page d'onboarding.
      </FieldHint>

      {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
      {success && (
        <p className="text-sm font-medium text-[var(--color-success-fg)]">{success}</p>
      )}

      <Button type="submit" disabled={submitting} iconLeft={<Send className="w-4 h-4" />}>
        {submitting ? 'Envoi...' : 'Envoyer invitation'}
      </Button>

      {!compact && (
        <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Mail className="w-3.5 h-3.5" />
          Verifiez que `SUPABASE_SERVICE_ROLE_KEY` et `PFMP_APP_URL` sont definis sur Vercel.
        </p>
      )}
    </form>
  )
}

function getFallbackRole(
  roles: InviteUserRole[],
  preferred: InviteUserRole | undefined,
): InviteUserRole | null {
  if (preferred && roles.includes(preferred)) return preferred
  return roles[0] ?? null
}
