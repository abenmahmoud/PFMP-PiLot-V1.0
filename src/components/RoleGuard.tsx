import type { ReactNode } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { EmptyState } from './EmptyState'
import { ShieldAlert } from 'lucide-react'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

interface RoleGuardProps {
  allow: UserRole[]
  children: ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const me = useCurrentUser()
  if (!allow.includes(me.role)) {
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
