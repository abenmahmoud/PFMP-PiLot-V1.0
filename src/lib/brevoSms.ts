declare const process: {
  env: Record<string, string | undefined>
}

export interface BrevoSmsResult {
  messageId: string
  devMode: boolean
}

export async function sendBrevoSms(input: {
  recipientE164: string
  content: string
}): Promise<BrevoSmsResult> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = (process.env.BREVO_SMS_SENDER ?? 'PFMPPilot').slice(0, 11)
  const devMode = process.env.BREVO_DEV_MODE === 'true'

  if (!apiKey || devMode) {
    if (!devMode) {
      throw new Error('Service SMS non configure, contactez l administrateur.')
    }
    return { messageId: `dev-${Date.now()}`, devMode: true }
  }

  const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      recipient: input.recipientE164,
      content: input.content,
      type: 'transactional',
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as { messageId?: string; code?: string; message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? payload.code ?? `Envoi SMS Brevo impossible (${response.status}).`)
  }
  return { messageId: payload.messageId ?? `brevo-${Date.now()}`, devMode: false }
}

export function maskPhoneE164(value: string | null | undefined): string {
  if (!value) return 'Non renseigne'
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return value
  const last = digits.slice(-2)
  const prefix = value.startsWith('+33') ? '+33' : value.slice(0, Math.min(4, value.length))
  return `${prefix} ${digits.slice(prefix === '+33' ? 2 : 0, prefix === '+33' ? 3 : 2)} XX XX XX ${last}`.replace(/\s+/g, ' ')
}
