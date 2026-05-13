import { createFileRoute, useParams } from '@tanstack/react-router'
import { StudentDetailContent } from './students.$id'

export const Route = createFileRoute('/admin/students/$id')({
  component: AdminStudentDetailPage,
})

function AdminStudentDetailPage() {
  const { id } = useParams({ from: '/admin/students/$id' })
  return <StudentDetailContent id={id} />
}
