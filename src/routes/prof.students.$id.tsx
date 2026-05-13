import { createFileRoute, useParams } from '@tanstack/react-router'
import { StudentDetailContent } from './students.$id'

export const Route = createFileRoute('/prof/students/$id')({
  component: ProfStudentDetailPage,
})

function ProfStudentDetailPage() {
  const { id } = useParams({ from: '/prof/students/$id' })
  return <StudentDetailContent id={id} />
}
