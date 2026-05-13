import { createFileRoute } from '@tanstack/react-router'
import { CompaniesPage } from './companies'

export const Route = createFileRoute('/prof/companies')({
  component: CompaniesPage,
})
