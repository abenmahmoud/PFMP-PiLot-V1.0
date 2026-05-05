export type AssistantType = 'superadmin' | 'establishment' | 'teacher'

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiRequest {
  assistantType: AssistantType
  prompt: string
  context?: Record<string, unknown>
}

export interface AiResponse {
  draft: string
  /** Information the user must provide for a higher-quality answer. */
  missingInformation?: string[]
  /** Bullet-style suggested next actions. */
  suggestedActions?: string[]
  /** Always remind callers that human validation is required. */
  requiresHumanValidation: true
  generatedAt: string
}

export interface AiInteractionLogEntry {
  id: string
  assistantType: AssistantType
  userId: string
  establishmentId: string | null
  inputSummary: string
  outputSummary: string
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: string
}
