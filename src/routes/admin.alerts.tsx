import { createFileRoute } from '@tanstack/react-router'
import { AlertsPage } from './alerts'

export const Route = createFileRoute('/admin/alerts')({
  component: AlertsPage,
})
