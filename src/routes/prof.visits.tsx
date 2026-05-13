import { createFileRoute } from '@tanstack/react-router'
import { Route as RouteIcon } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/prof/visits')({
  component: ProfVisitsPage,
})

function ProfVisitsPage() {
  return (
    <AppLayout title="Visites" subtitle="Espace professeur">
      <EmptyState
        icon={<RouteIcon className="h-5 w-5" />}
        title="Planning des visites en preparation"
        description="Les visites detaillees arrivent avec le sprint P2.0. Les visites existantes restent accessibles depuis les fiches eleves."
      />
    </AppLayout>
  )
}
