import { createFileRoute } from '@tanstack/react-router'
import { PortalLogin } from '@/components/PortalLogin'

export const Route = createFileRoute('/admin/login')({
  component: AdminLoginPage,
})

function AdminLoginPage() {
  return <PortalLogin portal="admin" />
}
