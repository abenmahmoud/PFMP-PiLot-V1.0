import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsPage } from './assignments'

export const Route = createFileRoute('/admin/assignments')({
  component: AssignmentsPage,
})
