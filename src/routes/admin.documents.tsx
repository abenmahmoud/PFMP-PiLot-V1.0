import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { DocumentsPage } from './documents'

export const Route = createFileRoute('/admin/documents')({
  component: AdminDocumentsPage,
})

function AdminDocumentsPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/admin/documents/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  return <DocumentsPage />
}
