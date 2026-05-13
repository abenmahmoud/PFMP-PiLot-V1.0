import { createFileRoute, useParams } from '@tanstack/react-router'
import { ClassDetailContent } from './classes.$id'

export const Route = createFileRoute('/prof/classes/$id')({
  component: ProfClassDetailPage,
})

function ProfClassDetailPage() {
  const { id } = useParams({ from: '/prof/classes/$id' })
  return <ClassDetailContent id={id} />
}
