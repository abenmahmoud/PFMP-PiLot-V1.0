import { createServerFn } from '@tanstack/react-start'
import type { GeneratedDocumentRow, ProfileRow } from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'
import {
  requestSignaturesForDocumentInternal,
  sendReminderForSignature,
  type SignatureSignerInput,
} from './signatures.functions'

export interface BatchSignaturesProgress {
  total: number
  fully_signed_count: number
  partial_count: number
  pending_count: number
  overdue_count: number
}

export const requestSignaturesForBatch = createServerFn({ method: 'POST' })
  .inputValidator(validateBatchRequestInput)
  .handler(async ({ data }): Promise<BatchSignaturesProgress> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const documents = await getBatchDocuments(adminClient, caller, data.establishmentId, data.batchId)
      let processed = 0

      for (const document of documents) {
        const signers = data.signersByDocument[document.id] ?? data.defaultSigners
        if (signers.length === 0) continue
        await requestSignaturesForDocumentInternal(adminClient, caller, {
          establishmentId: data.establishmentId,
          generatedDocumentId: document.id,
          signers,
        })
        processed += 1
      }

      await insertAuditLog(adminClient, {
        establishmentId: resolveEstablishment(caller, data.establishmentId),
        userId: caller.id,
        action: 'signature.batch_requested',
        description: 'Demandes de signatures en masse creees',
        metadata: { batch_id: data.batchId, processed },
      })

      return computeProgress(adminClient, documents)
    })
  })

export const getBatchSignaturesProgress = createServerFn({ method: 'POST' })
  .inputValidator(validateBatchProgressInput)
  .handler(async ({ data }): Promise<BatchSignaturesProgress> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const documents = await getBatchDocuments(adminClient, caller, data.establishmentId, data.batchId)
      return computeProgress(adminClient, documents)
    })
  })

export const sendBatchReminders = createServerFn({ method: 'POST' })
  .inputValidator(validateBatchProgressInput)
  .handler(async ({ data }): Promise<{ sent: number }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const documents = await getBatchDocuments(adminClient, caller, data.establishmentId, data.batchId)
      const { data: signatures, error } = await adminClient
        .from('document_signatures')
        .select('generated_document_id, signer_email, status')
        .in('generated_document_id', documents.map((document) => document.id))
        .in('status', ['pending', 'sent', 'viewed'])
      if (error) throw new Error(`Lecture relances impossible: ${error.message}`)

      let sent = 0
      for (const signature of (signatures as Array<{ generated_document_id: string | null; signer_email: string; status: string }>) ?? []) {
        if (!signature.generated_document_id) continue
        await sendReminderForSignature({
          data: {
            accessToken: data.accessToken,
            establishmentId: data.establishmentId,
            generatedDocumentId: signature.generated_document_id,
            signerEmail: signature.signer_email,
          },
        })
        sent += 1
      }

      await insertAuditLog(adminClient, {
        establishmentId: resolveEstablishment(caller, data.establishmentId),
        userId: caller.id,
        action: 'signature.batch_reminders_sent',
        description: 'Relances de signatures en masse envoyees',
        metadata: { batch_id: data.batchId, sent },
      })

      return { sent }
    })
  })

async function getBatchDocuments(
  adminClient: AdminClient,
  caller: ProfileRow,
  requestedEstablishmentId: string | null,
  batchId: string,
): Promise<GeneratedDocumentRow[]> {
  const establishmentId = resolveEstablishment(caller, requestedEstablishmentId)
  const { data, error } = await adminClient
    .from('generated_documents')
    .select('*')
    .eq('establishment_id', establishmentId)
    .contains('rendered_with', { batch_id: batchId })
    .order('generated_at', { ascending: false })
  if (error) throw new Error(`Lecture batch signatures impossible: ${error.message}`)
  return (data as unknown as GeneratedDocumentRow[]) ?? []
}

async function computeProgress(adminClient: AdminClient, documents: GeneratedDocumentRow[]): Promise<BatchSignaturesProgress> {
  if (documents.length === 0) {
    return { total: 0, fully_signed_count: 0, partial_count: 0, pending_count: 0, overdue_count: 0 }
  }
  const ids = documents.map((document) => document.id)
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('generated_document_id, status, magic_link_expires_at')
    .in('generated_document_id', ids)
  if (error) throw new Error(`Calcul progression impossible: ${error.message}`)

  const signatures = (data as Array<{ generated_document_id: string | null; status: string; magic_link_expires_at: string | null }>) ?? []
  const now = Date.now()
  let fully = 0
  let partial = 0
  let pending = 0
  let overdue = 0

  for (const document of documents) {
    const rows = signatures.filter((signature) => signature.generated_document_id === document.id)
    if (document.signature_status === 'fully_signed') fully += 1
    else if (rows.some((signature) => signature.status === 'signed')) partial += 1
    else pending += 1
    if (rows.some((signature) => signature.status !== 'signed' && signature.magic_link_expires_at && new Date(signature.magic_link_expires_at).getTime() < now)) {
      overdue += 1
    }
  }

  return {
    total: documents.length,
    fully_signed_count: fully,
    partial_count: partial,
    pending_count: pending,
    overdue_count: overdue,
  }
}

function validateBatchRequestInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  batchId: string
  defaultSigners: SignatureSignerInput[]
  signersByDocument: Record<string, SignatureSignerInput[]>
} {
  const record = asRecord(data)
  const signersByDocumentRaw = asOptionalRecord(record.signersByDocument)
  const signersByDocument: Record<string, SignatureSignerInput[]> = {}
  for (const [documentId, signers] of Object.entries(signersByDocumentRaw)) {
    signersByDocument[validateUuid(documentId, 'Document genere')] = Array.isArray(signers)
      ? signers.map((item) => validateSigner(asRecord(item)))
      : []
  }
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    batchId: requiredString(record.batchId, 'Batch'),
    defaultSigners: Array.isArray(record.defaultSigners) ? record.defaultSigners.map((item) => validateSigner(asRecord(item))) : [],
    signersByDocument,
  }
}

function validateBatchProgressInput(data: unknown): { accessToken: string; establishmentId: string | null; batchId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    batchId: requiredString(record.batchId, 'Batch'),
  }
}

function validateSigner(record: Record<string, unknown>): SignatureSignerInput {
  const role = clean(record.role) as SignatureSignerInput['role']
  if (!['student', 'parent', 'tutor', 'employer', 'school', 'referent', 'principal', 'ddfpt', 'admin'].includes(role)) {
    throw new Error('Role signataire invalide.')
  }
  return {
    role,
    name: requiredString(record.name, 'Nom signataire').slice(0, 160),
    email: requiredEmail(record.email),
    phone: optionalText(record.phone, 40),
    userId: optionalUuid(record.userId, 'Utilisateur'),
    tutorId: optionalUuid(record.tutorId, 'Tuteur'),
    studentId: optionalUuid(record.studentId, 'Eleve'),
    required: record.required !== false,
  }
}

function resolveEstablishment(caller: ProfileRow, requested: string | null): string | null {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ?? caller.establishment_id
    if (!establishmentId) throw new Error('Selectionnez un etablissement pour le batch signatures.')
    return establishmentId
  }
  if (requested && requested !== caller.establishment_id) throw new Error('Acces refuse: etablissement invalide.')
  return caller.establishment_id
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload invalide.')
  return value as Record<string, unknown>
}

function asOptionalRecord(value: unknown): Record<string, unknown> {
  if (value == null) return {}
  return asRecord(value)
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} obligatoire.`)
  return text
}

function requiredEmail(value: unknown): string {
  const email = requiredString(value, 'Email').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email signataire invalide.')
  return email
}

function optionalUuid(value: unknown, label: string): string | null {
  if (value == null || value === '') return null
  return validateUuid(value, label)
}

function optionalText(value: unknown, max: number): string | null {
  const text = clean(value)
  return text ? text.slice(0, max) : null
}
