import { useState } from 'react'
import { Sparkles, AlertTriangle, RefreshCw, Send } from 'lucide-react'
import { generateAiResponse, logAiInteraction } from '@/ai/aiService'
import type { AiResponse, AssistantType } from '@/ai/aiTypes'
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from './ui/Card'
import { Button } from './ui/Button'
import { Textarea } from './ui/Field'
import { useCurrentUser } from '@/lib/useCurrentUser'

interface AiAssistantPanelProps {
  type: AssistantType
  title: string
  description: string
  examples: string[]
  context?: Record<string, unknown>
}

export function AiAssistantPanel({
  type,
  title,
  description,
  examples,
  context,
}: AiAssistantPanelProps) {
  const me = useCurrentUser()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AiResponse | null>(null)

  async function ask(p: string) {
    setLoading(true)
    setPrompt(p)
    const res = await generateAiResponse({ assistantType: type, prompt: p, context })
    await logAiInteraction({
      assistantType: type,
      userId: me.id,
      establishmentId: me.establishmentId,
      inputSummary: p.slice(0, 120),
      outputSummary: res.draft.slice(0, 120),
    })
    setResponse(res)
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Sparkles className="w-4 h-4" />}>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap gap-2 mb-3">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => ask(ex)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Demandez quelque chose à l'assistant…"
            className="min-h-[60px] flex-1"
          />
          <Button
            onClick={() => prompt && ask(prompt)}
            disabled={loading || !prompt}
            iconLeft={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          >
            {loading ? 'Génération…' : 'Demander'}
          </Button>
        </div>
        {response && <AiSuggestionBox response={response} className="mt-4" />}
        <div className="mt-4 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-[var(--color-warning-fg)]" />
          <p>
            L'IA propose un brouillon. Elle ne décide jamais seule, n'invente pas, et toute
            génération est journalisée. Validation humaine obligatoire.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

export function AiSuggestionBox({
  response,
  className,
  onAccept,
  onReject,
}: {
  response: AiResponse
  className?: string
  onAccept?: () => void
  onReject?: () => void
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-[var(--color-brand-100)] bg-[var(--color-brand-50)]/50 p-4 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[var(--color-brand-700)]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          Brouillon IA — à valider
        </p>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text)] leading-relaxed">
        {response.draft}
      </pre>
      {response.missingInformation && response.missingInformation.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="font-semibold text-[var(--color-warning-fg)] mb-1">
            Informations à fournir :
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[var(--color-text-muted)]">
            {response.missingInformation.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {response.suggestedActions && response.suggestedActions.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="font-semibold text-[var(--color-text)] mb-1">Actions suggérées :</p>
          <ul className="list-disc pl-5 space-y-0.5 text-[var(--color-text-muted)]">
            {response.suggestedActions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {(onAccept || onReject) && (
        <div className="mt-4 flex items-center gap-2">
          {onAccept && (
            <Button variant="primary" size="sm" onClick={onAccept}>
              Accepter le brouillon
            </Button>
          )}
          {onReject && (
            <Button variant="secondary" size="sm" onClick={onReject}>
              Rejeter
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
