import { createFileRoute, Navigate, Outlet, useMatchRoute } from '@tanstack/react-router'
import { RoleGuard } from '@/components/RoleGuard'

export const Route = createFileRoute('/admin')({
  component: AdminPortalLayout,
})

function AdminPortalLayout() {
  const matchRoute = useMatchRoute()
  const isLogin = matchRoute({ to: '/admin/login', fuzzy: true })
  const isIndex = matchRoute({ to: '/admin', fuzzy: false })

  if (isLogin) return <Outlet />
  if (isIndex) return <Navigate to="/admin/dashboard" replace />

  return (
    <RoleGuard allow={['admin', 'ddfpt', 'superadmin']}>
      <Outlet />
    </RoleGuard>
  )
}
