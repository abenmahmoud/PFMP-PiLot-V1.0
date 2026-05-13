import { createFileRoute } from '@tanstack/react-router'
import { ClipboardCheck } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/prof/reports')({
  component: ProfReportsPage,
})

function ProfReportsPage() {
  return (
    <AppLayout title="Comptes-rendus" subtitle="Visites et bilans PFMP">
      <EmptyState
        icon={<ClipboardCheck className="h-5 w-5" />}
        title="Comptes-rendus en preparation"
        description="La saisie detaillee des comptes-rendus arrive avec le module visites."
      />
    </AppLayout>
  )
}
