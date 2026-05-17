import { createServerFn } from '@tanstack/react-start'
import type {
  ClassDocumentTemplateAssignmentRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  DocumentTemplateRow,
  EstablishmentRow,
  GeneratedDocumentRow,
  Json,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StudentRow,
  TutorRow,
  UserRole,
} from '@/lib/database.types'
import { renderConventionPdf } from '@/lib/pdfConvention'
import { computeDocumentHash } from '@/lib/signatureCrypto'
import {
  finalizeSignedDocumentInternal,
  requestSignaturesForDocumentInternal,
  type SignatureSignerInput,
} from '@/server/signatures.functions'
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

const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']

export interface GenerateConventionPdfResult {
  generatedDocumentId: string
  version: number
  storagePath: string
  downloadUrl: string | null
}

export interface SendConventionSignaturesResult {
  signaturesSent: number
  recipients: Array<{ role: string; name: string; email: string }>
}

export interface DownloadConventionPdfResult {
  pdfBase64: string
  filename: string
  sha256Hex: string
}

export interface PendingConventionValidationItem {
  document: DocumentRow
  placement: PlacementRow
  student: StudentRow
  company: CompanyRow | null
  tutor: TutorRow | null
  period: PfmpPeriodRow | null
  isMinor: boolean
}

export const generateConventionPdf = createServerFn({ method: 'POST' })
  .inputValidator(validateDocumentActionInput)
  .handler(async ({ data }): Promise<GenerateConventionPdfResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const context = await loadConventionContext(adminClient, data.documentId)
      assertSameTenant(caller, context.document.establishment_id, data.establishmentId)
      if (context.document.type !== 'convention') throw new Error('Ce document n est pas une convention PFMP.')
      if (!['draft', 'generated'].includes(context.document.status)) {
        throw new Error('La convention doit etre en brouillon avant generation PDF.')
      }
      assertConventionComplete(context)

      const template = await resolveTemplateForConvention(adminClient, context)
      const { pdfBytes, sha256Hex } = await renderConventionPdf({ template, data: context })
      const version = await nextGeneratedVersion(adminClient, context.document.id)
      const bucket = process.env.GENERATED_PDFS_BUCKET ?? 'generated-pdfs'
      const storagePath = `${context.document.establishment_id}/${context.document.id}/v${version}.pdf`
      const { error: uploadError } = await adminClient.storage.from(bucket).upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })
      if (uploadError) throw new Error(`Upload convention PDF impossible: ${uploadError.message}`)

      const { data: generatedRow, error: insertError } = await adminClient
        .from('generated_documents')
        .insert({
          establishment_id: context.document.establishment_id,
          document_id: context.document.id,
          template_id: template.id,
          version,
          storage_path: storagePath,
          file_size_bytes: pdfBytes.byteLength,
          mime_type: 'application/pdf',
          sha256_hex: sha256Hex,
          generated_by: caller.id,
          rendered_with: {
            engine: 'pdfConvention',
            template_id: template.id,
            template_version: template.version,
            source_kind: template.source_kind,
          } as Json,
          signature_status: 'not_required',
          required_signers: [],
          signature_proof: {},
          pdf_kind: 'final',
        })
        .select('*')
        .single()
      if (insertError) throw new Error(`Creation document genere impossible: ${insertError.message}`)
      const generated = generatedRow as unknown as GeneratedDocumentRow

      const { error: updateError } = await adminClient
        .from('documents')
        .update({
          generated_document_id: generated.id,
          storage_path: storagePath,
          status: 'generated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.document.id)
      if (updateError) throw new Error(`Mise a jour convention impossible: ${updateError.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: context.document.establishment_id,
        userId: caller.id,
        action: 'convention.pdf_generated',
        description: 'Convention PFMP generee en PDF',
        metadata: { document_id: context.document.id, generated_document_id: generated.id, version },
      })

      const downloadUrl = await createSignedUrl(adminClient, bucket, storagePath)
      return { generatedDocumentId: generated.id, version, storagePath, downloadUrl }
    })
  })

export const sendConventionForSignatures = createServerFn({ method: 'POST' })
  .inputValidator(validateDocumentActionInput)
  .handler(async ({ data }): Promise<SendConventionSignaturesResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const context = await loadConventionContext(adminClient, data.documentId)
      assertSameTenant(caller, context.document.establishment_id, data.establishmentId)
      if (!context.document.generated_document_id) throw new Error('Generez le PDF avant l envoi en signature.')
      assertConventionComplete(context)

      const signers = await buildConventionSigners(caller, context)
      await requestSignaturesForDocumentInternal(adminClient, caller, {
        establishmentId: data.establishmentId,
        generatedDocumentId: context.document.generated_document_id,
        signers,
      })

      const now = new Date().toISOString()
      const [{ error: documentError }, { error: placementError }] = await Promise.all([
        adminClient.from('documents').update({ status: 'pending_signatures', updated_at: now }).eq('id', context.document.id),
        adminClient.from('placements').update({ status: 'pending_convention', updated_at: now }).eq('id', context.placement.id),
      ])
      if (documentError) throw new Error(`Mise a jour convention impossible: ${documentError.message}`)
      if (placementError) throw new Error(`Mise a jour dossier PFMP impossible: ${placementError.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: context.document.establishment_id,
        userId: caller.id,
        action: 'convention.signatures_requested',
        description: 'Convention PFMP envoyee pour signatures',
        metadata: { document_id: context.document.id, generated_document_id: context.document.generated_document_id, signers: signers.length },
      })

      return {
        signaturesSent: signers.length,
        recipients: signers.map((signer) => ({ role: signer.role, name: signer.name, email: signer.email })),
      }
    })
  })

export const downloadPaperBackupPdf = createServerFn({ method: 'POST' })
  .inputValidator(validateDocumentActionInput)
  .handler(async ({ data }): Promise<DownloadConventionPdfResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const context = await loadConventionContext(adminClient, data.documentId)
      assertSameTenant(caller, context.document.establishment_id, data.establishmentId)
      if (context.document.type !== 'convention') throw new Error('Ce document n est pas une convention PFMP.')
      if (context.document.status === 'missing') throw new Error('Completez le dossier avant de telecharger le PDF papier.')
      assertConventionComplete(context)
      const template = await resolveTemplateForConvention(adminClient, context)
      const { pdfBytes, sha256Hex } = await renderConventionPdf({ template, data: context, paperBackup: true })
      return {
        pdfBase64: Buffer.from(pdfBytes).toString('base64'),
        filename: `convention-${slugify(context.student.last_name)}-${slugify(context.student.first_name)}-papier.pdf`,
        sha256Hex,
      }
    })
  })

export const downloadFinalSignedPdf = createServerFn({ method: 'POST' })
  .inputValidator(validateDocumentActionInput)
  .handler(async ({ data }): Promise<DownloadConventionPdfResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const context = await loadConventionContext(adminClient, data.documentId)
      assertSameTenant(caller, context.document.establishment_id, data.establishmentId)
      if (context.document.status !== 'signed' || !context.document.generated_document_id) {
        throw new Error('Le PDF final est disponible uniquement apres signature complete.')
      }
      const generated = await getGeneratedDocument(adminClient, context.document.generated_document_id)
      if (generated.signature_status !== 'fully_signed') throw new Error('Signatures incompletes.')
      const bucket = process.env.GENERATED_PDFS_BUCKET ?? 'generated-pdfs'
      const storagePath = generated.final_signed_pdf_url ?? generated.storage_path
      const { data: blob, error } = await adminClient.storage.from(bucket).download(storagePath)
      if (error || !blob) throw new Error(`Telechargement PDF signe impossible: ${error?.message ?? 'fichier vide'}`)
      const pdfBytes = new Uint8Array(await blob.arrayBuffer())
      const sha256Hex = computeDocumentHash(pdfBytes)
      if (generated.final_signed_sha256_hex && generated.final_signed_sha256_hex !== sha256Hex) {
        throw new Error('Verification hash du PDF signe impossible.')
      }
      return {
        pdfBase64: Buffer.from(pdfBytes).toString('base64'),
        filename: `convention-${slugify(context.student.last_name)}-${slugify(context.student.first_name)}-signee.pdf`,
        sha256Hex,
      }
    })
  })

export const listPendingConventionsForValidation = createServerFn({ method: 'POST' })
  .inputValidator(validateListInput)
  .handler(async ({ data }): Promise<PendingConventionValidationItem[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const { data: documentRows, error } = await adminClient
        .from('documents')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('type', 'convention')
        .in('status', ['draft', 'generated'])
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
      if (error) throw new Error(`Lecture conventions a valider impossible: ${error.message}`)
      const docs = (documentRows as unknown as DocumentRow[]) ?? []
      const items: PendingConventionValidationItem[] = []
      for (const doc of docs) {
        try {
          const context = await loadConventionContext(adminClient, doc.id)
          items.push({
            document: context.document,
            placement: context.placement,
            student: context.student,
            company: context.company,
            tutor: context.tutor,
            period: context.period,
            isMinor: isStudentMinor(context.student),
          })
        } catch {
          // Une convention incomplete reste visible sur sa fiche; la liste validation
          // garde uniquement les dossiers exploitables.
        }
      }
      return items
    })
  })

export const recomputeConventionSignatureStatus = createServerFn({ method: 'POST' })
  .inputValidator(validateGeneratedDocumentActionInput)
  .handler(async ({ data }): Promise<{ signatureStatus: GeneratedDocumentRow['signature_status'] }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageConventions(caller)
      const document = await getGeneratedDocument(adminClient, data.generatedDocumentId)
      assertSameTenant(caller, document.establishment_id, data.establishmentId)
      const signatureStatus = await recomputeConventionSignatureStatusInternal(adminClient, data.generatedDocumentId, caller.id)
      return { signatureStatus }
    })
  })

export async function recomputeConventionSignatureStatusInternal(
  adminClient: AdminClient,
  generatedDocumentId: string,
  userId: string | null,
): Promise<GeneratedDocumentRow['signature_status']> {
  const document = await getGeneratedDocument(adminClient, generatedDocumentId)
  const signatures = await listGeneratedSignatures(adminClient, generatedDocumentId)
  if (signatures.length === 0 || signatures.some((signature) => signature.status !== 'signed')) {
    const nextStatus = signatures.some((signature) => signature.status === 'signed') ? 'partial_signed' : 'pending_signatures'
    const { error } = await adminClient.from('generated_documents').update({ signature_status: nextStatus }).eq('id', generatedDocumentId)
    if (error) throw new Error(`Mise a jour statut signature impossible: ${error.message}`)
    return nextStatus
  }
  await finalizeSignedDocumentInternal(adminClient, generatedDocumentId, userId)
  const { data, error } = await adminClient.from('generated_documents').select('signature_status').eq('id', document.id).maybeSingle()
  if (error) throw new Error(`Lecture statut final impossible: ${error.message}`)
  return ((data as { signature_status?: GeneratedDocumentRow['signature_status'] } | null)?.signature_status ?? 'fully_signed')
}

interface ConventionContext {
  document: DocumentRow
  placement: PlacementRow
  student: StudentRow
  class: ClassRow | null
  period: PfmpPeriodRow
  company: CompanyRow
  tutor: TutorRow
  establishment: EstablishmentRow
  ddfpt: ProfileRow | null
}

async function loadConventionContext(adminClient: AdminClient, documentId: string): Promise<ConventionContext> {
  const document = await getLogicalDocument(adminClient, documentId)
  if (!document.placement_id) throw new Error('Convention sans dossier PFMP rattache.')
  const placement = await getRow<PlacementRow>(adminClient, 'placements', document.placement_id, 'Dossier PFMP')
  const student = await getRow<StudentRow>(adminClient, 'students', placement.student_id, 'Eleve')
  const [klass, period, company, tutor, establishment, ddfpt] = await Promise.all([
    student.class_id ? getRow<ClassRow>(adminClient, 'classes', student.class_id, 'Classe') : Promise.resolve(null),
    getRow<PfmpPeriodRow>(adminClient, 'pfmp_periods', placement.period_id, 'Periode PFMP'),
    placement.company_id ? getRow<CompanyRow>(adminClient, 'companies', placement.company_id, 'Entreprise') : Promise.resolve(null),
    placement.tutor_id ? getRow<TutorRow>(adminClient, 'tutors', placement.tutor_id, 'Tuteur entreprise') : Promise.resolve(null),
    getRow<ConventionContext['establishment']>(adminClient, 'establishments', document.establishment_id, 'Etablissement'),
    fetchDdfptProfile(adminClient, document.establishment_id),
  ])
  if (!company) throw new Error('Entreprise obligatoire pour generer la convention.')
  if (!tutor) throw new Error('Tuteur entreprise obligatoire pour generer la convention.')
  return { document, placement, student, class: klass, period, company, tutor, establishment, ddfpt }
}

async function resolveTemplateForConvention(adminClient: AdminClient, context: ConventionContext): Promise<DocumentTemplateRow> {
  if (context.class) {
    const { data, error } = await adminClient
      .from('class_document_template_assignments')
      .select('*')
      .eq('establishment_id', context.document.establishment_id)
      .eq('class_id', context.class.id)
      .eq('type', 'convention')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Lecture affectation modele impossible: ${error.message}`)
    const assignment = data as unknown as ClassDocumentTemplateAssignmentRow | null
    if (assignment) return getRow<DocumentTemplateRow>(adminClient, 'document_templates', assignment.template_id, 'Modele convention')
  }
  if (context.document.template_id) {
    return getRow<DocumentTemplateRow>(adminClient, 'document_templates', context.document.template_id, 'Modele convention')
  }
  throw new Error('Aucun modele de convention affecte a la classe.')
}

async function buildConventionSigners(
  caller: ProfileRow,
  context: ConventionContext,
): Promise<SignatureSignerInput[]> {
  if (!context.tutor.email) throw new Error('Email du tuteur entreprise obligatoire pour envoyer la signature.')
  const signers: SignatureSignerInput[] = [
    {
      role: 'tutor',
      name: `${context.tutor.first_name} ${context.tutor.last_name}`.trim(),
      email: normalizeEmail(context.tutor.email),
      phone: context.tutor.phone,
      userId: null,
      tutorId: context.tutor.id,
      studentId: null,
      required: true,
      assuranceLevel: 'advanced',
    },
  ]

  if (isStudentMinor(context.student)) {
    if (!context.student.parent_email) throw new Error('Email du responsable legal obligatoire pour un eleve mineur.')
    signers.push({
      role: 'parent',
      name: [context.student.parent_first_name, context.student.parent_last_name].filter(Boolean).join(' ') || 'Responsable legal',
      email: normalizeEmail(context.student.parent_email),
      phone: context.student.parent_phone ?? null,
      userId: null,
      tutorId: null,
      studentId: context.student.id,
      required: true,
      assuranceLevel: 'advanced',
    })
  }

  const ddfpt = context.ddfpt ?? (caller.role === 'ddfpt' ? caller : null)
  if (!ddfpt?.email) throw new Error('Aucun DDFPT avec email n est rattache a cet etablissement.')
  signers.push({
    role: 'ddfpt',
    name: `${ddfpt.first_name} ${ddfpt.last_name}`.trim(),
    email: normalizeEmail(ddfpt.email),
    phone: null,
    userId: null,
    tutorId: null,
    studentId: null,
    required: true,
    assuranceLevel: 'advanced',
  })
  return dedupeSigners(signers)
}

function assertConventionComplete(context: ConventionContext): void {
  if (!context.placement.company_id) throw new Error('Entreprise obligatoire avant generation PDF.')
  if (!context.placement.tutor_id) throw new Error('Tuteur entreprise obligatoire avant generation PDF.')
  if (!context.placement.start_date || !context.placement.end_date) throw new Error('Dates de stage obligatoires avant generation PDF.')
}

async function nextGeneratedVersion(adminClient: AdminClient, documentId: string): Promise<number> {
  const { data, error } = await adminClient
    .from('generated_documents')
    .select('version')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw new Error(`Lecture version document impossible: ${error.message}`)
  const latest = ((data as Array<{ version: number }> | null) ?? [])[0]?.version ?? 0
  return latest + 1
}

async function createSignedUrl(adminClient: AdminClient, bucket: string, storagePath: string): Promise<string | null> {
  const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(storagePath, 60 * 10)
  if (error) return null
  return data.signedUrl
}

async function getLogicalDocument(adminClient: AdminClient, documentId: string): Promise<DocumentRow> {
  return getRow<DocumentRow>(adminClient, 'documents', documentId, 'Convention')
}

async function getGeneratedDocument(adminClient: AdminClient, generatedDocumentId: string): Promise<GeneratedDocumentRow> {
  return getRow<GeneratedDocumentRow>(adminClient, 'generated_documents', generatedDocumentId, 'Document genere')
}

async function getRow<T>(adminClient: AdminClient, table: string, id: string, label: string): Promise<T> {
  const { data, error } = await adminClient.from(table).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Lecture ${label} impossible: ${error.message}`)
  if (!data) throw new Error(`${label} introuvable.`)
  return data as unknown as T
}

async function fetchDdfptProfile(adminClient: AdminClient, establishmentId: string): Promise<ProfileRow | null> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('role', 'ddfpt')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture DDFPT impossible: ${error.message}`)
  return (data as unknown as ProfileRow | null) ?? null
}

async function listGeneratedSignatures(adminClient: AdminClient, generatedDocumentId: string): Promise<Array<{ status: string }>> {
  const { data, error } = await adminClient.from('document_signatures').select('status').eq('generated_document_id', generatedDocumentId)
  if (error) throw new Error(`Lecture signatures impossible: ${error.message}`)
  return (data as Array<{ status: string }> | null) ?? []
}

function assertCanManageConventions(caller: ProfileRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) throw new Error('Acces refuse: gestion conventions reservee admin/DDFPT.')
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

function isStudentMinor(student: StudentRow): boolean {
  if (!student.birth_date) return false
  const limit = new Date()
  limit.setFullYear(limit.getFullYear() - 18)
  return new Date(student.birth_date).getTime() > limit.getTime()
}

function dedupeSigners(signers: SignatureSignerInput[]): SignatureSignerInput[] {
  const seen = new Set<string>()
  return signers.filter((signer) => {
    const key = `${signer.role}:${signer.email}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeEmail(value: string): string {
  const email = clean(value).toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Email invalide: ${value}`)
  return email
}

function slugify(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'document'
}

function validateDocumentActionInput(data: unknown): { accessToken: string; establishmentId: string | null; documentId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    documentId: validateUuid(record.documentId, 'Document'),
  }
}

function validateGeneratedDocumentActionInput(data: unknown): { accessToken: string; establishmentId: string | null; generatedDocumentId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    generatedDocumentId: validateUuid(record.generatedDocumentId, 'Document genere'),
  }
}

function validateListInput(data: unknown): { accessToken: string; establishmentId: string | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
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

function optionalUuid(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null
  return validateUuid(value, label)
}
