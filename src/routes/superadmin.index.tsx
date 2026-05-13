import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/superadmin/')({
  component: () => <Navigate to="/superadmin/dashboard" replace />,
})
