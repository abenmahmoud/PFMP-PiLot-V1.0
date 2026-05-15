import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { PeriodsPage } from './pfmp-periods'

export const Route = createFileRoute('/admin/pfmp-periods')({
  component: AdminPfmpPeriodsPage,
})

function AdminPfmpPeriodsPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/admin/pfmp-periods/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  return <PeriodsPage />
}
