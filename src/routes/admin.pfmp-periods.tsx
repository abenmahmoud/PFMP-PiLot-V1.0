import { createFileRoute } from '@tanstack/react-router'
import { PeriodsPage } from './pfmp-periods'

export const Route = createFileRoute('/admin/pfmp-periods')({
  component: PeriodsPage,
})
