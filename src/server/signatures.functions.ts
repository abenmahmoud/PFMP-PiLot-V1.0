import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import type {
  DocumentRow,
  DocumentSignatureRow,
  GeneratedDocumentRow,
  Json,
  ProfileRow,
  SignatureMethod,
  SignatureRequestEmailRow,
  SignatureStatus,
  SignerRole,
  UserRole,
} from '@/lib/database.types'
import { buildSignatureProofBundle, embedSignaturesInPdf } from '@/lib/pdfSignatures'
import { computeDocumentHash, generateMagicLinkToken, hashMagicLinkToken } from '@/lib/signatureCrypto'
import { sendSignatureRequestEmail } from '@/lib/emailSignatureRequest'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

declare const process: {
  env: Record<string, string | undefined>
}

export interface SignatureSignerInput {
  role: SignerRole
  name: string
  email: string
  phone: string | null
  userId: string | null
  tutorId: string | null
  studentId: string | null
  required: boolean
}

export interface SignatureStatusResult {
  document: GeneratedDocumentRow
  logicalDocument: DocumentRow | null
  required: SignatureSignerInput[]
  completed: DocumentSignatureRow[]
  pending: DocumentSignatureRow[]
  allSignatures: DocumentSignatureRow[]
  can_be_finalized: boolean
}

export interface PublicSignatureRequest {
  signature: Pick<DocumentSignatureRow, 'id' | 'signer_email' | 'signer_name' | 'signer_role' | 'status' | 'document_hash'>
  document: Pick<GeneratedDocumentRow, 'id' | 'sha256_hex' | 'generated_at' | 'signature_status'>
  logicalDocument: Pick<DocumentRow, 'id' | 'name' | 'type'> | null
  expiresAt: string
}

export interface PublicDocumentVerification {
  document: Pick<GeneratedDocumentRow, 'id' | 'signature_status' | 'final_signed_sha256_hex' | 'sha256_hex' | 'generated_at' | 'final_signed_pdf_url'>
  logicalDocument: Pick<DocumentRow, 'id' | 'name' | 'type' | 'status'> | null
  signatures: Array<Pick<DocumentSignatureRow, 'id' | 'signer_name' | 'signer_role' | 'status' | 'signed_at' | 'document_hash' | 'signature_method'>>
  valid: boolean
}

export interface PublicSignatureSubmitResult {
  ok: true
  generatedDocumentId: string
  signatureStatus: GeneratedDocumentRow['signature_status']
}

export interface SignatureDashboardItem {
  document: GeneratedDocumentRow
  logicalDocument: DocumentRow | null
  signatures: DocumentSignatureRow[]
}

export interface DocumentSignatureWorkspace {
  logicalDocument: DocumentRow
  generatedDocuments: Array<{
    document: GeneratedDocumentRow
    signatures: DocumentSignatureRow[]
  }>
}

export interface RequestSignaturesInternalInput {
  establishmentId: string | null
  generatedDocumentId: string
  signers: SignatureSignerInput[]
}

const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const SIGNER_ROLES: SignerRole[] = ['student', 'parent', 'tutor', 'employer', 'school', 'referent', 'principal', 'ddfpt', 'admin']
const SIGNATURE_METHODS: SignatureMethod[] = ['click_to_sign', 'draw_signature', 'sms_otp']

export const requestSignaturesForDocument = createServerFn({ method: 'POST' })
  .inputValidator(validateRequestInput)
  .handler(async ({ data }): Promise<SignatureStatusResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      return requestSignaturesForDocumentInternal(adminClient, caller, data)
    })
  })

export const getDocumentSignaturesStatus = createServerFn({ method: 'POST' })
  .inputValidator(validateStatusInput)
  .handler(async ({ data }): Promise<SignatureStatusResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      assertCanReadGeneratedDocument(caller, document, data.establishmentId)
      return getStatus(adminClient, document.id)
    })
  })

export const getSignatureRequestByToken = createServerFn({ method: 'POST' })
  .inputValidator(validateTokenInput)
  .handler(async ({ data }): Promise<PublicSignatureRequest | null> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const tokenHash = hashMagicLinkToken(data.token)
      const signature = await findSignatureByTokenHash(adminClient, tokenHash)
      if (!signature) return null
      if (signature.status === 'signed') return null
      if (signature.magic_link_expires_at && new Date(signature.magic_link_expires_at).getTime() < Date.now()) {
        await updateSignatureStatus(adminClient, signature.id, 'expired')
        return null
      }
      const document = await getGeneratedDocument(adminClient, required(signature.generated_document_id, 'Document genere'))
      const logicalDocument = await getLogicalDocument(adminClient, document.document_id)
      if (signature.status === 'sent') {
        await adminClient.from('document_signatures').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', signature.id)
      }
      return {
        signature: {
          id: signature.id,
          signer_email: signature.signer_email,
          signer_name: signature.signer_name,
          signer_role: signature.signer_role,
          status: signature.status,
          document_hash: signature.document_hash,
        },
        document: {
          id: document.id,
          sha256_hex: document.sha256_hex,
          generated_at: document.generated_at,
          signature_status: document.signature_status,
        },
        logicalDocument: logicalDocument
          ? {
              id: logicalDocument.id,
              name: logicalDocument.name,
              type: logicalDocument.type,
            }
          : null,
        expiresAt: signature.magic_link_expires_at ?? '',
      }
    })
  })

export const getPublicDocumentVerification = createServerFn({ method: 'POST' })
  .inputValidator(validatePublicVerificationInput)
  .handler(async ({ data }): Promise<PublicDocumentVerification | null> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      const logicalDocument = await getLogicalDocument(adminClient, document.document_id)
      const signatures = await listSignatures(adminClient, document.id)
      return {
        document: {
          id: document.id,
          signature_status: document.signature_status,
          final_signed_sha256_hex: document.final_signed_sha256_hex,
          sha256_hex: document.sha256_hex,
          generated_at: document.generated_at,
          final_signed_pdf_url: document.final_signed_pdf_url,
        },
        logicalDocument: logicalDocument
          ? {
              id: logicalDocument.id,
              name: logicalDocument.name,
              type: logicalDocument.type,
              status: logicalDocument.status,
            }
          : null,
        signatures: signatures.map((signature) => ({
          id: signature.id,
          signer_name: signature.signer_name,
          signer_role: signature.signer_role,
          status: signature.status,
          signed_at: signature.signed_at,
          document_hash: signature.document_hash,
          signature_method: signature.signature_method,
        })),
        valid: document.signature_status === 'fully_signed' && signatures.length > 0 && signatures.every((signature) => signature.status === 'signed'),
      }
    })
  })

export const signDocumentViaMagicLink = createServerFn({ method: 'POST' })
  .inputValidator(validateMagicSignInput)
  .handler(async ({ data }): Promise<PublicSignatureSubmitResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const tokenHash = hashMagicLinkToken(data.token)
      const signature = await findSignatureByTokenHash(adminClient, tokenHash)
      if (!signature) throw new Error('Lien de signature invalide ou expire.')
      if (signature.status === 'signed') throw new Error('Document deja signe avec ce lien.')
      if (signature.magic_link_expires_at && new Date(signature.magic_link_expires_at).getTime() < Date.now()) {
        await updateSignatureStatus(adminClient, signature.id, 'expired')
        throw new Error('Lien de signature expire.')
      }
      const document = await getGeneratedDocument(adminClient, required(signature.generated_document_id, 'Document genere'))
      const hash = resolveDocumentHash(document)
      await signSignatureRow(adminClient, signature, data.method, data.signatureData, hash, data.ip ?? getRequestIp(), data.userAgent ?? getRequestUserAgent())
      await markTokenUsed(adminClient, tokenHash)
      await insertAuditLog(adminClient, {
        establishmentId: document.establishment_id,
        userId: null,
        action: 'signature.signed_magic_link',
        description: 'Document signe via lien magique',
        metadata: { generated_document_id: document.id, signature_id: signature.id, signer_role: signature.signer_role },
      })
      await maybeFinalizeDocument(adminClient, document.id, null)
      const nextDocument = await getGeneratedDocument(adminClient, document.id)
      return { ok: true, generatedDocumentId: nextDocument.id, signatureStatus: nextDocument.signature_status }
    })
  })

export const signDocumentAsAuthenticatedUser = createServerFn({ method: 'POST' })
  .inputValidator(validateAuthenticatedSignInput)
  .handler(async ({ data }): Promise<SignatureStatusResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      assertCanReadGeneratedDocument(caller, document, data.establishmentId)
      const signature = await findPendingSignatureForCaller(adminClient, document.id, caller)
      if (!signature) throw new Error('Aucune signature en attente pour votre compte.')
      const hash = resolveDocumentHash(document)
      await signSignatureRow(adminClient, signature, data.method, data.signatureData, hash, getRequestIp(), getRequestUserAgent())
      await insertAuditLog(adminClient, {
        establishmentId: document.establishment_id,
        userId: caller.id,
        action: 'signature.signed',
        description: 'Document signe par utilisateur authentifie',
        metadata: { generated_document_id: document.id, signature_id: signature.id, method: data.method },
      })
      await maybeFinalizeDocument(adminClient, document.id, caller.id)
      return getStatus(adminClient, document.id)
    })
  })

export const sendReminderForSignature = createServerFn({ method: 'POST' })
  .inputValidator(validateReminderInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageSignatures(caller)
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      assertSameTenant(caller, document.establishment_id, data.establishmentId)
      const signature = await findSignatureByEmail(adminClient, document.id, data.signerEmail)
      if (!signature) throw new Error('Signature introuvable pour cet email.')
      const email = await findSignatureEmail(adminClient, signature.id)
      if (email) {
        await adminClient
          .from('signature_request_emails')
          .update({
            reminder_count: email.reminder_count + 1,
            last_reminder_at: new Date().toISOString(),
          })
          .eq('id', email.id)
      }
      await insertAuditLog(adminClient, {
        establishmentId: document.establishment_id,
        userId: caller.id,
        action: 'signature.reminder_sent',
        description: 'Relance signature envoyee',
        metadata: { generated_document_id: document.id, signer_email: data.signerEmail },
      })
      return { ok: true }
    })
  })

export const revokeSignatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(validateReminderInput)
  .handler(async ({ data }): Promise<SignatureStatusResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageSignatures(caller)
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      assertSameTenant(caller, document.establishment_id, data.establishmentId)
      const signature = await findSignatureByEmail(adminClient, document.id, data.signerEmail)
      if (!signature) throw new Error('Signature introuvable pour cet email.')
      if (signature.status === 'signed') throw new Error('Impossible de revoquer une signature deja signee.')
      await updateSignatureStatus(adminClient, signature.id, 'cancelled')
      await insertAuditLog(adminClient, {
        establishmentId: document.establishment_id,
        userId: caller.id,
        action: 'signature.revoked',
        description: 'Demande de signature annulee',
        metadata: { generated_document_id: document.id, signer_email: data.signerEmail },
      })
      return getStatus(adminClient, document.id)
    })
  })

export const listSignatureDashboard = createServerFn({ method: 'POST' })
  .inputValidator(validateDashboardInput)
  .handler(async ({ data }): Promise<SignatureDashboardItem[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageSignatures(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const { data: generatedRows, error } = await adminClient
        .from('generated_documents')
        .select('*')
        .eq('establishment_id', establishmentId)
        .neq('signature_status', 'not_required')
        .order('generated_at', { ascending: false })
        .limit(80)
      if (error) throw new Error(`Lecture tableau signatures impossible: ${error.message}`)
      const documents = (generatedRows as unknown as GeneratedDocumentRow[]) ?? []
      if (documents.length === 0) return []
      const [logicalDocuments, signatureRows] = await Promise.all([
        fetchLogicalDocuments(adminClient, unique(documents.map((document) => document.document_id))),
        fetchSignaturesForDocuments(adminClient, documents.map((document) => document.id)),
      ])
      return documents.map((document) => ({
        document,
        logicalDocument: logicalDocuments.get(document.document_id) ?? null,
        signatures: signatureRows.filter((signature) => signature.generated_document_id === document.id),
      }))
    })
  })

export const getDocumentSignatureWorkspace = createServerFn({ method: 'POST' })
  .inputValidator(validateWorkspaceInput)
  .handler(async ({ data }): Promise<DocumentSignatureWorkspace> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageSignatures(caller)
      const logicalDocument = await getLogicalDocument(adminClient, data.documentId)
      if (!logicalDocument) throw new Error('Document introuvable.')
      assertSameTenant(caller, logicalDocument.establishment_id, data.establishmentId)
      const { data: generatedRows, error } = await adminClient
        .from('generated_documents')
        .select('*')
        .eq('document_id', logicalDocument.id)
        .order('generated_at', { ascending: false })
      if (error) throw new Error(`Lecture generations impossible: ${error.message}`)
      const generatedDocuments = (generatedRows as unknown as GeneratedDocumentRow[]) ?? []
      const signatures = await fetchSignaturesForDocuments(adminClient, generatedDocuments.map((document) => document.id))
      return {
        logicalDocument,
        generatedDocuments: generatedDocuments.map((document) => ({
          document,
          signatures: signatures.filter((signature) => signature.generated_document_id === document.id),
        })),
      }
    })
  })

export async function finalizeSignedDocumentInternal(adminClient: AdminClient, generatedDocumentId: string, userId: string | null): Promise<void> {
  await maybeFinalizeDocument(adminClient, generatedDocumentId, userId)
}

export async function requestSignaturesForDocumentInternal(
  adminClient: AdminClient,
  caller: ProfileRow,
  input: RequestSignaturesInternalInput,
): Promise<SignatureStatusResult> {
  assertCanManageSignatures(caller)
  const document = await getGeneratedDocument(adminClient, input.generatedDocumentId)
  assertSameTenant(caller, document.establishment_id, input.establishmentId)
  const logicalDocument = await getLogicalDocument(adminClient, document.document_id)
  const documentHash = resolveDocumentHash(document)
  const baseUrl = process.env.SIGNATURE_MAGIC_LINK_BASE_URL ?? 'https://www.pfmp-pilot.fr/sign'
  const ttlDays = Number(process.env.SIGNATURE_MAGIC_LINK_TTL_DAYS ?? '30')
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()

  for (const signer of input.signers) {
    const token = signer.userId ? null : generateMagicLinkToken()
    const tokenHash = token ? hashMagicLinkToken(token) : null
    const signature = await createOrReuseSignature(adminClient, document, logicalDocument, signer, documentHash, tokenHash, expiresAt)
    if (token && tokenHash) {
      await createTutorAccessToken(adminClient, document, signature, signer, tokenHash, expiresAt)
      await recordSignatureEmail(adminClient, document, signature, signer, tokenHash)
      await sendSignatureRequestEmail({
        to: signer.email,
        signerName: signer.name,
        magicLink: `${baseUrl}/${token}`,
        docName: logicalDocument?.name ?? 'Document PFMP',
        role: signer.role,
      })
    }
  }

  const { error } = await adminClient
    .from('generated_documents')
    .update({
      signature_status: 'pending_signatures',
      required_signers: input.signers as unknown as Json,
    })
    .eq('id', document.id)
  if (error) throw new Error(`Activation signatures impossible: ${error.message}`)

  await insertAuditLog(adminClient, {
    establishmentId: document.establishment_id,
    userId: caller.id,
    action: 'signature.requested',
    description: 'Demandes de signature creees',
    metadata: { generated_document_id: document.id, signers: input.signers.length },
  })

  return getStatus(adminClient, document.id)
}

async function maybeFinalizeDocument(adminClient: AdminClient, generatedDocumentId: string, userId: string | null): Promise<void> {
  const document = await getGeneratedDocument(adminClient, generatedDocumentId)
  const signatures = await listSignatures(adminClient, generatedDocumentId)
  if (signatures.length === 0 || signatures.some((signature) => signature.status !== 'signed')) {
    await updateGeneratedSignatureStatus(adminClient, document.id, signatures.some((signature) => signature.status === 'signed') ? 'partial_signed' : 'pending_signatures')
    return
  }
  const proof = buildSignatureProofBundle(document, signatures)
  const finalPdf = await createFinalSignedPdf(adminClient, document, signatures)
  const finalHash = finalPdf.hash ?? computeDocumentHash(JSON.stringify(proof))
  const { error } = await adminClient
    .from('generated_documents')
    .update({
      signature_status: 'fully_signed',
      final_signed_pdf_url: finalPdf.path ?? document.final_signed_pdf_url ?? document.storage_path,
      final_signed_sha256_hex: finalHash,
      signature_proof: proof as unknown as Json,
    })
    .eq('id', document.id)
  if (error) throw new Error(`Finalisation document impossible: ${error.message}`)
  await insertAuditLog(adminClient, {
    establishmentId: document.establishment_id,
    userId,
    action: 'signature.finalized',
    description: 'Document finalise avec toutes les signatures',
    metadata: { generated_document_id: document.id, final_hash: finalHash },
  })
}

async function createFinalSignedPdf(
  adminClient: AdminClient,
  document: GeneratedDocumentRow,
  signatures: DocumentSignatureRow[],
): Promise<{ path: string | null; hash: string | null }> {
  const bucket = process.env.GENERATED_PDFS_BUCKET ?? 'generated-pdfs'
  if (!document.storage_path) return { path: null, hash: null }
  const { data, error } = await adminClient.storage.from(bucket).download(document.storage_path)
  if (error || !data) {
    console.warn('[signature-final-pdf] download skipped:', error?.message ?? 'empty file')
    return { path: null, hash: null }
  }
  const original = new Uint8Array(await data.arrayBuffer())
  const verificationBaseUrl = process.env.SIGNATURE_VERIFY_BASE_URL ?? 'https://www.pfmp-pilot.fr/verify'
  const signedPdf = await embedSignaturesInPdf(original, signatures, `${verificationBaseUrl}/${document.id}`)
  const finalPath = signedPath(document)
  const { error: uploadError } = await adminClient.storage.from(bucket).upload(finalPath, signedPdf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (uploadError) throw new Error(`Upload PDF signe impossible: ${uploadError.message}`)
  return { path: finalPath, hash: computeDocumentHash(signedPdf) }
}

async function getStatus(adminClient: AdminClient, generatedDocumentId: string): Promise<SignatureStatusResult> {
  const document = await getGeneratedDocument(adminClient, generatedDocumentId)
  const logicalDocument = await getLogicalDocument(adminClient, document.document_id)
  const allSignatures = await listSignatures(adminClient, document.id)
  const completed = allSignatures.filter((signature) => signature.status === 'signed')
  const pending = allSignatures.filter((signature) => signature.status !== 'signed' && signature.status !== 'cancelled' && signature.status !== 'expired')
  return {
    document,
    logicalDocument,
    required: parseRequiredSigners(document.required_signers),
    completed,
    pending,
    allSignatures,
    can_be_finalized: allSignatures.length > 0 && pending.length === 0,
  }
}

async function createOrReuseSignature(
  adminClient: AdminClient,
  document: GeneratedDocumentRow,
  logicalDocument: DocumentRow | null,
  signer: SignatureSignerInput,
  documentHash: string,
  tokenHash: string | null,
  expiresAt: string,
): Promise<DocumentSignatureRow> {
  const existing = await findSignatureByEmail(adminClient, document.id, signer.email)
  if (existing) return existing
  const { data, error } = await adminClient
    .from('document_signatures')
    .insert({
      establishment_id: document.establishment_id,
      document_id: logicalDocument?.id ?? document.document_id,
      generated_document_id: document.id,
      signer_email: signer.email,
      signer_name: signer.name,
      signer_role: signer.role,
      signer_user_id: signer.userId,
      signer_tutor_id: signer.tutorId,
      signer_student_id: signer.studentId,
      signer_phone: signer.phone,
      status: tokenHash ? 'sent' : 'pending',
      sent_at: tokenHash ? new Date().toISOString() : null,
      signature_method: 'click_to_sign',
      signed_document_sha256: null,
      document_hash: documentHash,
      magic_link_token_hash: tokenHash,
      magic_link_expires_at: tokenHash ? expiresAt : null,
      signing_order: 1,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation signature impossible: ${error.message}`)
  return data as unknown as DocumentSignatureRow
}

async function createTutorAccessToken(
  adminClient: AdminClient,
  document: GeneratedDocumentRow,
  signature: DocumentSignatureRow,
  signer: SignatureSignerInput,
  tokenHash: string,
  expiresAt: string,
): Promise<void> {
  if (!signer.tutorId) return
  const { error } = await adminClient.from('tutor_access_tokens').insert({
    establishment_id: document.establishment_id,
    tutor_id: signer.tutorId,
    placement_id: null,
    document_signature_id: signature.id,
    token_hash: tokenHash,
    scope: 'sign',
    expires_at: expiresAt,
    max_uses: 1,
    status: 'active',
  })
  if (error) throw new Error(`Creation token tuteur impossible: ${error.message}`)
}

async function recordSignatureEmail(
  adminClient: AdminClient,
  document: GeneratedDocumentRow,
  signature: DocumentSignatureRow,
  signer: SignatureSignerInput,
  tokenHash: string,
): Promise<void> {
  const { error } = await adminClient.from('signature_request_emails').insert({
    establishment_id: document.establishment_id,
    document_id: document.id,
    signature_id: signature.id,
    signer_email: signer.email,
    signer_role: signer.role,
    token_hash: tokenHash,
  })
  if (error) throw new Error(`Audit email signature impossible: ${error.message}`)
}

async function signSignatureRow(
  adminClient: AdminClient,
  signature: DocumentSignatureRow,
  method: SignatureMethod,
  signatureData: string | null,
  documentHash: string,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const signedAt = new Date().toISOString()
  const { error } = await adminClient
    .from('document_signatures')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signature_method: method,
      signature_data: signatureData,
      signed_document_sha256: documentHash,
      document_hash: documentHash,
      ip_address: normalizeInet(ip),
      user_agent: userAgent,
      signed_from_ip: ip,
      signed_from_user_agent: userAgent,
      magic_link_used_at: signature.magic_link_token_hash ? signedAt : signature.magic_link_used_at,
      updated_at: signedAt,
    })
    .eq('id', signature.id)
  if (error) throw new Error(`Signature impossible: ${error.message}`)
}

async function markTokenUsed(adminClient: AdminClient, tokenHash: string): Promise<void> {
  const { error } = await adminClient
    .from('tutor_access_tokens')
    .update({ used_at: new Date().toISOString(), used_count: 1, status: 'used' })
    .eq('token_hash', tokenHash)
  if (error) throw new Error(`Marquage token impossible: ${error.message}`)
}

async function updateSignatureStatus(adminClient: AdminClient, signatureId: string, status: SignatureStatus): Promise<void> {
  const { error } = await adminClient.from('document_signatures').update({ status, updated_at: new Date().toISOString() }).eq('id', signatureId)
  if (error) throw new Error(`Mise a jour signature impossible: ${error.message}`)
}

async function updateGeneratedSignatureStatus(adminClient: AdminClient, generatedDocumentId: string, status: GeneratedDocumentRow['signature_status']): Promise<void> {
  const { error } = await adminClient.from('generated_documents').update({ signature_status: status }).eq('id', generatedDocumentId)
  if (error) throw new Error(`Mise a jour statut document impossible: ${error.message}`)
}

async function getGeneratedDocument(adminClient: AdminClient, generatedDocumentId: string): Promise<GeneratedDocumentRow> {
  const { data, error } = await adminClient.from('generated_documents').select('*').eq('id', generatedDocumentId).maybeSingle()
  if (error) throw new Error(`Lecture document genere impossible: ${error.message}`)
  if (!data) throw new Error('Document genere introuvable.')
  return data as unknown as GeneratedDocumentRow
}

async function getLogicalDocument(adminClient: AdminClient, documentId: string): Promise<DocumentRow | null> {
  const { data, error } = await adminClient.from('documents').select('*').eq('id', documentId).maybeSingle()
  if (error) throw new Error(`Lecture document impossible: ${error.message}`)
  return (data as unknown as DocumentRow | null) ?? null
}

async function fetchLogicalDocuments(adminClient: AdminClient, documentIds: string[]): Promise<Map<string, DocumentRow>> {
  if (documentIds.length === 0) return new Map()
  const { data, error } = await adminClient.from('documents').select('*').in('id', documentIds)
  if (error) throw new Error(`Lecture documents impossible: ${error.message}`)
  return new Map(((data as unknown as DocumentRow[]) ?? []).map((document) => [document.id, document]))
}

async function fetchSignaturesForDocuments(adminClient: AdminClient, generatedDocumentIds: string[]): Promise<DocumentSignatureRow[]> {
  if (generatedDocumentIds.length === 0) return []
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .in('generated_document_id', generatedDocumentIds)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Lecture signatures impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow[]) ?? []
}

async function listSignatures(adminClient: AdminClient, generatedDocumentId: string): Promise<DocumentSignatureRow[]> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('generated_document_id', generatedDocumentId)
    .order('signing_order')
    .order('created_at')
  if (error) throw new Error(`Lecture signatures impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow[]) ?? []
}

async function findSignatureByEmail(adminClient: AdminClient, generatedDocumentId: string, email: string): Promise<DocumentSignatureRow | null> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('generated_document_id', generatedDocumentId)
    .eq('signer_email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`Recherche signature impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow | null) ?? null
}

async function findPendingSignatureForCaller(adminClient: AdminClient, generatedDocumentId: string, caller: ProfileRow): Promise<DocumentSignatureRow | null> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('generated_document_id', generatedDocumentId)
    .or(`signer_user_id.eq.${caller.id},signer_email.eq.${caller.email}`)
    .neq('status', 'signed')
    .maybeSingle()
  if (error) throw new Error(`Recherche signature utilisateur impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow | null) ?? null
}

async function findSignatureByTokenHash(adminClient: AdminClient, tokenHash: string): Promise<DocumentSignatureRow | null> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('magic_link_token_hash', tokenHash)
    .maybeSingle()
  if (error) throw new Error(`Recherche token signature impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow | null) ?? null
}

async function findSignatureEmail(adminClient: AdminClient, signatureId: string): Promise<SignatureRequestEmailRow | null> {
  const { data, error } = await adminClient
    .from('signature_request_emails')
    .select('*')
    .eq('signature_id', signatureId)
    .maybeSingle()
  if (error) throw new Error(`Lecture email signature impossible: ${error.message}`)
  return (data as unknown as SignatureRequestEmailRow | null) ?? null
}

function assertCanManageSignatures(caller: ProfileRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) throw new Error('Acces refuse: gestion signatures reservee admin/DDFPT.')
}

function assertCanReadGeneratedDocument(caller: ProfileRow, document: GeneratedDocumentRow, requested?: string | null): void {
  if (caller.role === 'superadmin') {
    if (requested && requested !== document.establishment_id) throw new Error('Acces refuse: document hors tenant.')
    return
  }
  if (!caller.establishment_id || caller.establishment_id !== document.establishment_id) throw new Error('Acces refuse: document hors tenant.')
}

function assertSameTenant(caller: ProfileRow, establishmentId: string, requested?: string | null): void {
  if (caller.role === 'superadmin') {
    if (requested && requested !== establishmentId) throw new Error('Acces refuse: etablissement superadmin invalide.')
    return
  }
  if (!caller.establishment_id || caller.establishment_id !== establishmentId) throw new Error('Acces refuse: ressource hors tenant.')
}

function resolveRequestedEstablishment(caller: ProfileRow, requested?: string | null): string {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ?? caller.establishment_id
    if (!establishmentId) throw new Error('Selectionnez un etablissement pour cette action.')
    return establishmentId
  }
  if (!caller.establishment_id) throw new Error('Etablissement appelant introuvable.')
  if (requested && requested !== caller.establishment_id) throw new Error('Acces refuse: etablissement invalide.')
  return caller.establishment_id
}

function resolveDocumentHash(document: GeneratedDocumentRow): string {
  return document.sha256_hex ?? computeDocumentHash(`${document.id}:${document.storage_path}:${document.generated_at}`)
}

function signedPath(document: GeneratedDocumentRow): string {
  const cleanPath = document.storage_path.replace(/\.pdf$/i, '')
  return `${cleanPath}.signed-v${document.version}.pdf`
}

function parseRequiredSigners(value: Json): SignatureSignerInput[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => validateSigner(asRecord(item))).filter((signer) => signer.required)
}

function normalizeInet(value: string | null): string | null {
  if (!value) return null
  return value.includes(',') ? value.split(',')[0]?.trim() ?? null : value
}

function getRequestIp(): string | null {
  return getRequestHeader('x-forwarded-for') ?? getRequestHeader('x-real-ip') ?? null
}

function getRequestUserAgent(): string | null {
  return getRequestHeader('user-agent') ?? null
}

function validateRequestInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  generatedDocumentId: string
  signers: SignatureSignerInput[]
} {
  const record = asRecord(data)
  const signers = Array.isArray(record.signers) ? record.signers.map((item) => validateSigner(asRecord(item))) : []
  if (signers.length === 0) throw new Error('Au moins un signataire est requis.')
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document genere'),
    signers,
  }
}

function validateStatusInput(data: unknown): { accessToken: string; establishmentId: string | null; generatedDocumentId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document genere'),
  }
}

function validateTokenInput(data: unknown): { token: string } {
  const record = asRecord(data)
  return { token: requiredString(record.token, 'Token') }
}

function validatePublicVerificationInput(data: unknown): { generatedDocumentId: string } {
  const record = asRecord(data)
  return { generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document') }
}

function validateMagicSignInput(data: unknown): {
  token: string
  method: SignatureMethod
  signatureData: string | null
  ip: string | null
  userAgent: string | null
} {
  const record = asRecord(data)
  return {
    token: requiredString(record.token, 'Token'),
    method: parseSignatureMethod(record.method),
    signatureData: optionalText(record.signatureData, 300000),
    ip: optionalText(record.ip, 80),
    userAgent: optionalText(record.userAgent, 500),
  }
}

function validateAuthenticatedSignInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  generatedDocumentId: string
  method: SignatureMethod
  signatureData: string | null
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document genere'),
    method: parseSignatureMethod(record.method),
    signatureData: optionalText(record.signatureData, 300000),
  }
}

function validateReminderInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  generatedDocumentId: string
  signerEmail: string
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document genere'),
    signerEmail: requiredEmail(record.signerEmail),
  }
}

function validateDashboardInput(data: unknown): { accessToken: string; establishmentId: string | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
  }
}

function validateWorkspaceInput(data: unknown): { accessToken: string; establishmentId: string | null; documentId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    documentId: validateUuid(record.documentId, 'Document'),
  }
}

function validateSigner(record: Record<string, unknown>): SignatureSignerInput {
  const role = parseSignerRole(record.role)
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

function parseSignerRole(value: unknown): SignerRole {
  const role = clean(value) as SignerRole
  if (!SIGNER_ROLES.includes(role)) throw new Error('Role signataire invalide.')
  return role
}

function parseSignatureMethod(value: unknown): SignatureMethod {
  const method = clean(value) as SignatureMethod
  if (!SIGNATURE_METHODS.includes(method)) return 'click_to_sign'
  return method
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

function required(value: string | null, label: string): string {
  if (!value) throw new Error(`${label} obligatoire.`)
  return value
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

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
