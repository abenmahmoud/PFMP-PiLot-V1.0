import { Sparkles } from 'lucide-react'
import type { CompanySuggestion } from '@/server/aiMatchmaking.functions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'

export function MatchmakingCard({
  suggestion,
  onSelect,
}: {
  suggestion: CompanySuggestion
  onSelect: (suggestion: CompanySuggestion) => void
}) {
  return (
    <Card className="border-[var(--color-brand-100)]">
      <CardHeader className="pb-2">
        <div className="min-w-0">
          <CardTitle icon={<Sparkles className="w-4 h-4" />}>{suggestion.company.name}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {suggestion.company.city || 'Ville non renseignee'}
          </p>
        </div>
        <Badge tone={suggestion.score >= 70 ? 'success' : suggestion.score >= 45 ? 'info' : 'warning'}>
          {suggestion.score}/100
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <ul className="space-y-1">
          {suggestion.reasons.slice(0, 4).map((reason) => (
            <li key={reason} className="text-xs text-[var(--color-text-muted)]">
              - {reason}
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="subtle" onClick={() => onSelect(suggestion)}>
          Affecter cette entreprise
        </Button>
      </CardBody>
    </Card>
  )
}
