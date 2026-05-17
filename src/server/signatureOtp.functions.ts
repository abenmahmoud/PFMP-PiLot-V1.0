import { createServerFn } from '@tanstack/react-start'
import type { DocumentSignatureRow } from '@/lib/database.types'
import { hashMagicLinkToken } from '@/lib/signatureCrypto'
import { requestOtp, verifyOtp } from '@/lib/signatureOtp'
import { clean, createAdminClient, safeHandlerCall, validateUuid, type AdminClient } from './_lib'

export const requestSignatureOtp = createServerFn({ method: 'POST' })
  .inputValidator(validateRequestOtpInput)
  .handler(async ({ data }): Promise<{ challenge_id: string; masked_phone: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const signature = await resolveSignatureByMagicToken(adminClient, data.token)
      return requestOtp(adminClient, signature, data.phoneRaw)
    })
  })

export const verifySignatureOtp = createServerFn({ method: 'POST' })
  .inputValidator(validateVerifyOtpInput)
  .handler(async ({ data }): Promise<{ verified: boolean; attempts_left?: number; locked_until?: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const signature = await resolveSignatureByMagicToken(adminClient, data.token)
      return verifyOtp(adminClient, signature.id, data.challengeId, data.code)
    })
  })

async function resolveSignatureByMagicToken(adminClient: AdminClient, token: string): Promise<DocumentSignatureRow> {
  const tokenHash = hashMagicLinkToken(token)
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('magic_link_token_hash', tokenHash)
    .maybeSingle()
  if (error) throw new Error(`Recherche signature impossible: ${error.message}`)
  if (!data) throw new Error('Lien de signature invalide ou expire.')
  const signature = data as unknown as DocumentSignatureRow
  if (signature.status === 'signed') throw new Error('Document deja signe.')
  if (signature.magic_link_expires_at && new Date(signature.magic_link_expires_at).getTime() < Date.now()) {
    throw new Error('Lien de signature expire.')
  }
  return signature
}

function validateRequestOtpInput(data: unknown): { token: string; phoneRaw: string } {
  const record = asRecord(data)
  return {
    token: requiredString(record.token, 'Token'),
    phoneRaw: requiredString(record.phone_raw ?? record.phoneRaw, 'Telephone'),
  }
}

function validateVerifyOtpInput(data: unknown): { token: string; challengeId: string; code: string } {
  const record = asRecord(data)
  const code = requiredString(record.code, 'Code OTP').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(code)) throw new Error('Le code OTP doit contenir 6 chiffres.')
  return {
    token: requiredString(record.token, 'Token'),
    challengeId: validateUuid(record.challenge_id ?? record.challengeId, 'Challenge OTP'),
    code,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload invalide.')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} requis.`)
  return text
}
