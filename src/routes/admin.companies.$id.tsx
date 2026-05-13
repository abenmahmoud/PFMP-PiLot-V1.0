import { createFileRoute, useParams } from '@tanstack/react-router'
import { CompanyDetailContent } from './companies.$id'

export const Route = createFileRoute('/admin/companies/$id')({
  component: AdminCompanyDetailPage,
})

function AdminCompanyDetailPage() {
  const { id } = useParams({ from: '/admin/companies/$id' })
  return <CompanyDetailContent id={id} />
}
