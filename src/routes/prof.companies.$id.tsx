import { createFileRoute, useParams } from '@tanstack/react-router'
import { CompanyDetailContent } from './companies.$id'

export const Route = createFileRoute('/prof/companies/$id')({
  component: ProfCompanyDetailPage,
})

function ProfCompanyDetailPage() {
  const { id } = useParams({ from: '/prof/companies/$id' })
  return <CompanyDetailContent id={id} />
}
