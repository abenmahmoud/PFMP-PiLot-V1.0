import { createFileRoute } from '@tanstack/react-router'
import { AlertsPage } from './alerts'

export const Route = createFileRoute('/prof/alerts')({
  component: AlertsPage,
})
