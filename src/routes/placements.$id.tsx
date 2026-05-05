import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import { PlacementCard } from '@/components/PlacementCard'
import { placements } from '@/data/demo'

export const Route = createFileRoute('/placements/$id')({ component: PlacementDetailPage })

function PlacementDetailPage() {
  const { id } = useParams({ from: '/placements/$id' })
  const placement = placements.find((p) => p.id === id)
  return (
    <AppLayout title="Fiche stage">
      {placement ? (
        <div className="max-w-2xl">
          <PlacementCard placement={placement} />
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Vue détaillée prochainement : documents, visites, historique, actions rapides.
          </p>
        </div>
      ) : (
        <EmptyState
          title="Stage introuvable"
          action={
            <Link to="/students">
              <Button iconLeft={<ArrowLeft className="w-4 h-4" />} variant="secondary">
                Retour
              </Button>
            </Link>
          }
        />
      )}
    </AppLayout>
  )
}
