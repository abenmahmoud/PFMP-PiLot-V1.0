import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from './activity'

export const Route = createFileRoute('/admin/activity')({
  component: ActivityPage,
})
