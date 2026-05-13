import { createFileRoute, useParams } from '@tanstack/react-router'
import { TeacherDetailContent } from './teachers.$id'

export const Route = createFileRoute('/admin/teachers/$id')({
  component: AdminTeacherDetailPage,
})

function AdminTeacherDetailPage() {
  const { id } = useParams({ from: '/admin/teachers/$id' })
  return <TeacherDetailContent id={id} />
}
