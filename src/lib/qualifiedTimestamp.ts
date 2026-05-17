import { createHmac, timingSafeEqual } from 'node:crypto'

declare const process: {
  env: Record<string, string | undefined>
}

export interface QualifiedTimestampPayload {
  document_id: string
  signer_email: string
  signed_at: string
  sha256_at_sign: string
  phone_e164: string | null
  mention_handwritten: string
}

const HEADER = { alg: 'HS512', typ: 'JWT', kid: 'pfmp-tsa-v1' }

export function generateTimestampToken(payload: QualifiedTimestampPayload): string {
  const secret = getSecret()
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    iss: 'pfmp-pilot.fr',
  }
  const encodedHeader = base64Url(JSON.stringify(HEADER))
  const encodedPayload = base64Url(JSON.stringify(body))
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret)
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifyTimestampToken(token: string): { valid: boolean; payload?: Record<string, unknown> } {
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false }
  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`, getSecret())
  if (!safeEqual(signature, expected)) return { valid: false }
  try {
    return { valid: true, payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown> }
  } catch {
    return { valid: false }
  }
}

function getSecret(): string {
  const secret = process.env.SIGNATURE_TSA_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SIGNATURE_TSA_SECRET manquant ou trop court pour horodatage qualifie.')
  }
  return secret
}

function sign(value: string, secret: string): string {
  return createHmac('sha512', secret).update(value).digest('base64url')
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
