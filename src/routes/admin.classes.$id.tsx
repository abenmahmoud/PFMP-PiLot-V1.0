import { createFileRoute, useParams } from '@tanstack/react-router'
import { ClassDetailContent } from './classes.$id'

export const Route = createFileRoute('/admin/classes/$id')({
  component: AdminClassDetailPage,
})

function AdminClassDetailPage() {
  const { id } = useParams({ from: '/admin/classes/$id' })
  return <ClassDetailContent id={id} />
}
