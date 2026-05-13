import { createFileRoute } from '@tanstack/react-router'
import { StudentsPage } from './students.index'

export const Route = createFileRoute('/admin/students/')({
  component: StudentsPage,
})
