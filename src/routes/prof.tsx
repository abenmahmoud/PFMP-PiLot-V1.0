import { createFileRoute, Navigate, Outlet, useMatchRoute } from '@tanstack/react-router'
import { RoleGuard } from '@/components/RoleGuard'

export const Route = createFileRoute('/prof')({
  component: ProfPortalLayout,
})

function ProfPortalLayout() {
  const matchRoute = useMatchRoute()
  const isLogin = matchRoute({ to: '/prof/login', fuzzy: true })
  const isIndex = matchRoute({ to: '/prof', fuzzy: false })

  if (isLogin) return <Outlet />
  if (isIndex) return <Navigate to="/prof/dashboard" replace />

  return (
    <RoleGuard allow={['principal', 'referent']}>
      <Outlet />
    </RoleGuard>
  )
}
