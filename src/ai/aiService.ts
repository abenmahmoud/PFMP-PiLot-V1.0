import type { AiRequest, AiResponse } from './aiTypes'
import { mockAiResponses } from './mockAiResponses'

/**
 * Single entry point for any AI call in the application.
 *
 * Today: returns a deterministic mocked response for the given assistant.
 * Tomorrow: this function will call a Supabase Edge Function or a server route
 * that holds the model API key. The signature should remain stable.
 *
 * Always returns a draft. Always requires human validation.
 */
export async function generateAiResponse(req: AiRequest): Promise<AiResponse> {
  await new Promise((r) => setTimeout(r, 500))
  const handler = mockAiResponses[req.assistantType]
  return handler(req.prompt)
}

/**
 * Records an AI generation in the audit trail. Mocked for now — will write to
 * the `ai_interactions` table on Supabase.
 */
export async function logAiInteraction(_input: {
  assistantType: AiRequest['assistantType']
  userId: string
  establishmentId: string | null
  inputSummary: string
  outputSummary: string
  relatedEntityType?: string
  relatedEntityId?: string
}): Promise<void> {
  // No-op in mock mode.
  return
}
