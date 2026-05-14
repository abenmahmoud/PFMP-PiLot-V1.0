import { ExternalLink, Route } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { TourSuggestion } from '@/server/visits.functions'

export function TourOptimizer({ suggestion }: { suggestion: TourSuggestion | null }) {
  if (!suggestion) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Route className="w-4 h-4" />}>Tournee optimisee</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[var(--color-text-muted)]">Distance estimee</p>
            <p className="font-semibold">{suggestion.totalDistanceKm.toFixed(1)} km</p>
          </div>
          <div className="rounded-lg bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[var(--color-text-muted)]">Duree estimee</p>
            <p className="font-semibold">{suggestion.estimatedDurationMinutes} min</p>
          </div>
        </div>
        <ol className="space-y-2">
          {suggestion.route.map((item, index) => (
            <li key={item.visit.id} className="flex gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{item.company?.name ?? 'Entreprise non affectee'}</p>
                <p className="text-[var(--color-text-muted)]">
                  {item.student ? `${item.student.first_name} ${item.student.last_name}` : 'Eleve'} - {item.company?.city ?? 'Ville inconnue'}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <a href={suggestion.directionsUrl} target="_blank" rel="noreferrer">
          <Button type="button" size="sm" variant="secondary" iconLeft={<ExternalLink className="w-4 h-4" />}>
            Ouvrir Google Maps
          </Button>
        </a>
      </CardBody>
    </Card>
  )
}
