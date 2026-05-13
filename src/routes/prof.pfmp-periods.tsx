import { createFileRoute } from '@tanstack/react-router'
import { PeriodsPage } from './pfmp-periods'

export const Route = createFileRoute('/prof/pfmp-periods')({
  component: PeriodsPage,
})
