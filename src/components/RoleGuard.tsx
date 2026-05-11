import type { ReactNode } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { EmptyState } from './EmptyState'
import { ShieldAlert } from 'lucide-react'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

interface RoleGuardProps {
  allow: UserRole[]
  children: ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const auth = useAuth()
  const me = useCurrentUser()
  const role = isDemoMode() ? me.role : auth.role
  const superadminTenantScope =
    !isDemoMode() && role === 'superadmin' && Boolean(auth.activeEstablishmentId)

  if (!isDemoMode() && auth.loading) {
    return (
      <EmptyState
        icon={<ShieldAlert className="w-5 h-5" />}
        title="Verification des droits"
        description="Lecture de votre session Supabase..."
      />
    )
  }

  if (!role || (!allow.includes(role) && !superadminTenantScope)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="w-5 h-5" />}
        title="Accès non autorisé"
        description={`Cette page est réservée aux rôles : ${allow.map((r) => ROLE_LABELS[r]).join(', ')}.`}
      />
    )
  }
  return <>{children}</>
}
