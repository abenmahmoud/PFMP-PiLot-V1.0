import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'

export const Route = createFileRoute('/')({
  component: HomeRedirect,
})

function HomeRedirect() {
  const auth = useAuth()

  if (!isDemoMode()) {
    if (auth.loading) return null
    if (!auth.profile) return <Navigate to="/login" />
    if (auth.role === 'superadmin') return <Navigate to="/superadmin" />
    if (auth.role === 'referent' || auth.role === 'principal') return <Navigate to="/my-students" />
    return <Navigate to="/dashboard" />
  }

  const me = useCurrentUser()
  if (me.role === 'superadmin') return <Navigate to="/superadmin" />
  if (me.role === 'referent' || me.role === 'principal') return <Navigate to="/my-students" />
  return <Navigate to="/dashboard" />
}
