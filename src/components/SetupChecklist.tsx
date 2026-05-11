import { Link } from '@tanstack/react-router'
import { CheckCircle2, Circle, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export interface SetupChecklistStep {
  id: 'account' | 'identity' | 'class' | 'student' | 'period'
  label: string
  done: boolean
  cta?: {
    label: string
    to: string
  }
}

interface SetupChecklistProps {
  steps: SetupChecklistStep[]
}

export function SetupChecklist({ steps }: SetupChecklistProps) {
  const remaining = steps.filter((step) => !step.done).length
  if (remaining === 0) return null

  const completed = steps.length - remaining

  return (
    <Card>
      <CardHeader className="flex-col items-start sm:flex-row sm:items-start">
        <div>
          <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>
            Configuration de votre etablissement
          </CardTitle>
          <CardDescription className="mt-1">
            {remaining} etape{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} avant
            de demarrer le suivi PFMP.
          </CardDescription>
        </div>
        <Badge tone="brand">
          {completed}/{steps.length}
        </Badge>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 w-5 h-5 shrink-0 text-[var(--color-success-fg)]" />
                ) : (
                  <Circle className="mt-0.5 w-5 h-5 shrink-0 text-[var(--color-text-subtle)]" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{step.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {step.done ? 'Etape terminee' : 'Action requise pour finaliser le tenant'}
                  </p>
                </div>
              </div>
              {!step.done && step.cta && (
                <Link to={step.cta.to} className="sm:shrink-0">
                  <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                    {step.cta.label}
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
