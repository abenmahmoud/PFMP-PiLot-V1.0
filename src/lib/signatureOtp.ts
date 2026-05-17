import { parsePhoneNumberFromString } from 'libphonenumber-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentSignatureRow, SignatureOtpChallengeRow } from '@/lib/database.types'
import { maskPhoneE164, sendBrevoSms } from '@/lib/brevoSms'
import { computeDocumentHash, constantTimeEqual, generateMagicLinkToken, generateOtpCode } from '@/lib/signatureCrypto'

type AdminClient = SupabaseClient

export interface RequestOtpResult {
  challenge_id: string
  masked_phone: string
}

export interface VerifyOtpResult {
  verified: boolean
  attempts_left?: number
  locked_until?: string
}

export async function requestOtp(
  adminClient: AdminClient,
  signature: DocumentSignatureRow,
  phoneRaw: string,
): Promise<RequestOtpResult> {
  if (signature.status === 'signed') throw new Error('Document deja signe.')
  const phoneE164 = normalizePhoneE164(phoneRaw)
  const code = generateOtpCode()
  const salt = generateMagicLinkToken()
  const otpHash = hashOtpWithSalt(code, salt)
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await expireActiveChallenges(adminClient, signature.id)

  const { data, error } = await adminClient
    .from('signature_otp_challenges')
    .insert({
      signature_id: signature.id,
      phone_e164: phoneE164,
      otp_hash: otpHash,
      otp_salt: salt,
      sent_at: now,
      expires_at: expiresAt,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation challenge OTP impossible: ${error.message}`)
  const challenge = data as unknown as SignatureOtpChallengeRow

  const sms = await sendBrevoSms({
    recipientE164: phoneE164,
    content: `Votre code de signature PFMP Pilot : ${code}. Valable 10 minutes. Ne le partagez avec personne.`,
  })

  await Promise.all([
    adminClient
      .from('signature_otp_challenges')
      .update({ brevo_message_id: sms.messageId })
      .eq('id', challenge.id),
    adminClient
      .from('document_signatures')
      .update({
        otp_phone_e164: phoneE164,
        otp_sent_at: now,
        otp_attempts: 0,
        otp_locked_until: null,
        updated_at: now,
      })
      .eq('id', signature.id),
  ])

  if (sms.devMode) {
    await adminClient.from('audit_logs').insert({
      establishment_id: signature.establishment_id,
      user_id: null,
      action: 'signature.otp_dev_code',
      description: 'Code OTP signature genere en mode developpement',
      metadata: {
        signature_id: signature.id,
        masked_phone: maskPhoneE164(phoneE164),
        dev_code: code,
      },
    })
  }

  return { challenge_id: challenge.id, masked_phone: maskPhoneE164(phoneE164) }
}

export async function verifyOtp(
  adminClient: AdminClient,
  signatureId: string,
  challengeId: string,
  code: string,
): Promise<VerifyOtpResult> {
  const challenge = await fetchChallenge(adminClient, challengeId)
  if (challenge.signature_id !== signatureId) throw new Error('Challenge OTP invalide pour cette signature.')
  if (challenge.verified_at) return { verified: true }
  if (new Date(challenge.expires_at).getTime() < Date.now()) throw new Error('Code OTP expire.')
  if (challenge.locked_until && new Date(challenge.locked_until).getTime() > Date.now()) {
    return { verified: false, locked_until: challenge.locked_until }
  }

  const expected = hashOtpWithSalt(code, challenge.otp_salt)
  if (constantTimeEqual(expected, challenge.otp_hash)) {
    const verifiedAt = new Date().toISOString()
    await Promise.all([
      adminClient.from('signature_otp_challenges').update({ verified_at: verifiedAt }).eq('id', challenge.id),
      adminClient
        .from('document_signatures')
        .update({ otp_verified_at: verifiedAt, otp_attempts: challenge.attempts, otp_locked_until: null, updated_at: verifiedAt })
        .eq('id', signatureId),
    ])
    return { verified: true }
  }

  const attempts = challenge.attempts + 1
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null
  await Promise.all([
    adminClient
      .from('signature_otp_challenges')
      .update({ attempts, locked_until: lockedUntil })
      .eq('id', challenge.id),
    adminClient
      .from('document_signatures')
      .update({ otp_attempts: attempts, otp_locked_until: lockedUntil, updated_at: new Date().toISOString() })
      .eq('id', signatureId),
  ])
  return lockedUntil ? { verified: false, locked_until: lockedUntil } : { verified: false, attempts_left: 5 - attempts }
}

export async function assertVerifiedSignatureOtp(
  adminClient: AdminClient,
  signatureId: string,
  challengeId: string,
): Promise<SignatureOtpChallengeRow> {
  const challenge = await fetchChallenge(adminClient, challengeId)
  if (challenge.signature_id !== signatureId || !challenge.verified_at) {
    throw new Error('Verification OTP manquante ou invalide.')
  }
  return challenge
}

export function normalizePhoneE164(phoneRaw: string): string {
  const phone = parsePhoneNumberFromString(phoneRaw, 'FR')
  if (!phone?.isValid()) throw new Error('Numero de telephone invalide.')
  return phone.number
}

async function expireActiveChallenges(adminClient: AdminClient, signatureId: string): Promise<void> {
  const { error } = await adminClient
    .from('signature_otp_challenges')
    .update({ expires_at: new Date().toISOString() })
    .eq('signature_id', signatureId)
    .is('verified_at', null)
  if (error) throw new Error(`Expiration anciens OTP impossible: ${error.message}`)
}

async function fetchChallenge(adminClient: AdminClient, challengeId: string): Promise<SignatureOtpChallengeRow> {
  const { data, error } = await adminClient
    .from('signature_otp_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle()
  if (error) throw new Error(`Lecture challenge OTP impossible: ${error.message}`)
  if (!data) throw new Error('Challenge OTP introuvable.')
  return data as unknown as SignatureOtpChallengeRow
}

function hashOtpWithSalt(code: string, salt: string): string {
  return computeDocumentHash(`${salt}:${code.trim()}`)
}
