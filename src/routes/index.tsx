import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/useCurrentUser'

export const Route = createFileRoute('/')({
  component: HomeRedirect,
})

function HomeRedirect() {
  const me = useCurrentUser()
  if (me.role === 'superadmin') return <Navigate to="/superadmin" />
  if (me.role === 'referent' || me.role === 'principal') return <Navigate to="/my-students" />
  return <Navigate to="/dashboard" />
}
