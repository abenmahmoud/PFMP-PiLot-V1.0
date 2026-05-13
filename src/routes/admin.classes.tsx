import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { isDemoMode } from '@/lib/supabase'
import { ClassesDemo, ClassesSupabase } from './classes'

export const Route = createFileRoute('/admin/classes')({
  component: AdminClassesPage,
})

function AdminClassesPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/admin/classes/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (isDemoMode()) return <ClassesDemo />
  return <ClassesSupabase />
}
