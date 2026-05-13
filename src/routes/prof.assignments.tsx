import { createFileRoute } from '@tanstack/react-router'
import { Network } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/prof/assignments')({
  component: ProfAssignmentsPage,
})

function ProfAssignmentsPage() {
  return (
    <AppLayout title="Affectations" subtitle="Referents PFMP et suivi de classe">
      <EmptyState
        icon={<Network className="h-5 w-5" />}
        title="Affectations depuis les fiches eleves"
        description="Pour l'instant, l'affectation d'un referent se fait depuis la fiche de l'eleve."
      />
    </AppLayout>
  )
}
