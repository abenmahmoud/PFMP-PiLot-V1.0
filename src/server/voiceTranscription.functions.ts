import { createServerFn } from '@tanstack/react-start'
import { clean, safeHandlerCall } from './_lib'

declare const process: {
  env: Record<string, string | undefined>
}

export interface StructuredVisitTranscript {
  summary: string
  student_satisfaction: number | null
  tutor_satisfaction: number | null
  flagged: boolean
  flag_reason: string | null
  key_points: string[]
  next_actions: string[]
  source: 'claude' | 'heuristic'
}

export const structureVisitTranscript = createServerFn({ method: 'POST' })
  .inputValidator(validateTextInput)
  .handler(async ({ data }): Promise<StructuredVisitTranscript> => {
    return safeHandlerCall(async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return heuristicStructure(data.transcript)
      return callClaudeStructure(apiKey, data.transcript).catch(() => heuristicStructure(data.transcript))
    })
  })

export const transcribeVisitAudio = createServerFn({ method: 'POST' })
  .inputValidator(validateAudioInput)
  .handler(async ({ data }): Promise<{ transcript: string; structured: StructuredVisitTranscript }> => {
    return safeHandlerCall(async () => {
      const transcript = data.transcriptFallback || 'Transcription audio serveur indisponible. Utilisez la dictee Web Speech cote navigateur.'
      return { transcript, structured: heuristicStructure(transcript) }
    })
  })

async function callClaudeStructure(apiKey: string, transcript: string): Promise<StructuredVisitTranscript> {
  const model = process.env.CLAUDE_MODEL_VOICE ?? 'claude-sonnet-4-20250514'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content:
            'Tu es un assistant pour referent PFMP. Structure ce compte-rendu brut en JSON strict avec les cles summary, student_satisfaction, tutor_satisfaction, flagged, flag_reason, key_points, next_actions. CR brut: ' +
            transcript,
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Claude indisponible: ${response.status}`)
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> }
  const text = payload.content?.find((part) => part.type === 'text')?.text ?? ''
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('Reponse Claude non JSON.')
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>
  return normalizeStructured(parsed, 'claude')
}

function heuristicStructure(transcript: string): StructuredVisitTranscript {
  const lower = transcript.toLowerCase()
  const flaggedWords = ['retard', 'absent', 'danger', 'probleme', 'difficulte', 'conflit', 'rupture']
  const flagged = flaggedWords.some((word) => lower.includes(word))
  const sentences = transcript
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const keyPoints = sentences.slice(0, 4)
  return {
    summary: sentences[0]?.slice(0, 180) || 'Compte-rendu de visite a completer.',
    student_satisfaction: inferScore(lower, ['eleve satisfait', 'motivé', 'motive', 'bonne progression']),
    tutor_satisfaction: inferScore(lower, ['tuteur satisfait', 'entreprise satisfaite', 'bon retour']),
    flagged,
    flag_reason: flagged ? 'Point de vigilance detecte dans la dictee.' : null,
    key_points: keyPoints.length > 0 ? keyPoints : ['Visite realisee.'],
    next_actions: flagged ? ['Reprendre le point de vigilance avec l equipe pedagogique.'] : ['Suivi normal a poursuivre.'],
    source: 'heuristic',
  }
}

function normalizeStructured(parsed: Record<string, unknown>, source: 'claude' | 'heuristic'): StructuredVisitTranscript {
  return {
    summary: clean(parsed.summary).slice(0, 240) || 'Compte-rendu structure.',
    student_satisfaction: normalizeScore(parsed.student_satisfaction),
    tutor_satisfaction: normalizeScore(parsed.tutor_satisfaction),
    flagged: Boolean(parsed.flagged),
    flag_reason: clean(parsed.flag_reason) || null,
    key_points: normalizeStringArray(parsed.key_points, 6),
    next_actions: normalizeStringArray(parsed.next_actions, 6),
    source,
  }
}

function inferScore(text: string, positiveSignals: string[]): number | null {
  if (positiveSignals.some((signal) => text.includes(signal))) return 4
  if (text.includes('excellent') || text.includes('tres bien')) return 5
  if (text.includes('insatisfait') || text.includes('pas satisfait')) return 2
  return null
}

function normalizeScore(value: unknown): number | null {
  const score = Number(value)
  if (!Number.isFinite(score)) return null
  return Math.min(5, Math.max(1, Math.round(score)))
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => clean(item)).filter(Boolean).slice(0, max)
}

function validateTextInput(data: unknown): { transcript: string } {
  const record = asRecord(data)
  return { transcript: requiredString(record.transcript, 'Transcription').slice(0, 15000) }
}

function validateAudioInput(data: unknown): { audioBase64: string; mimeType: string; transcriptFallback: string | null } {
  const record = asRecord(data)
  return {
    audioBase64: requiredString(record.audioBase64, 'Audio').slice(0, 5_000_000),
    mimeType: clean(record.mimeType) || 'audio/webm',
    transcriptFallback: clean(record.transcriptFallback) || null,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload invalide.')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} obligatoire.`)
  return text
}
