import { createFileRoute } from '@tanstack/react-router'
import { PortalLogin } from '@/components/PortalLogin'

export const Route = createFileRoute('/prof/login')({
  component: ProfLoginPage,
})

function ProfLoginPage() {
  return <PortalLogin portal="prof" />
}
