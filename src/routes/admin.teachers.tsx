import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { isDemoMode } from '@/lib/supabase'
import { TeachersDemo, TeachersSupabase } from './teachers'

export const Route = createFileRoute('/admin/teachers')({
  component: AdminTeachersPage,
})

function AdminTeachersPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/admin/teachers/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (isDemoMode()) return <TeachersDemo />
  return <TeachersSupabase />
}
