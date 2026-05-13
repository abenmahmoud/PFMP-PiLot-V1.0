import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { isDemoMode } from '@/lib/supabase'
import { CompaniesDemo, CompaniesSupabase } from './companies'

export const Route = createFileRoute('/admin/companies')({
  component: AdminCompaniesPage,
})

function AdminCompaniesPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/admin/companies/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (isDemoMode()) return <CompaniesDemo />
  return <CompaniesSupabase />
}
