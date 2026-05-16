import { createHash } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  ClassRow,
  CompanyRow,
  DocumentRow,
  DocumentSignatureRow,
  EstablishmentRow,
  GeneratedDocumentRow,
  Json,
  PlacementRow,
  SignatureStatus,
  SignerRole,
  StudentAccessCodeRow,
  StudentRow,
  TutorRow,
} from '@/lib/database.types'
import { computeDocumentHash, generateMagicLinkToken, hashMagicLinkToken } from '@/lib/signatureCrypto'
import { sendSignatureRequestEmail } from '@/lib/emailSignatureRequest'

declare const process: {
  env: Record<string, string | undefined>
}

export type StudentCodeError = 'CODE_INVALID' | 'CODE_REVOKED' | 'CODE_EXPIRED'

export interface StudentPublicSession {
  studentId: string
  firstName: string
  lastName: string
  className: string
  classId: string
  establishmentName: string
  validatedAt: string
}

export type ValidateStudentCodeResult =
  | { ok: true; session: StudentPublicSession }
  | { ok: false; error: StudentCodeError }

export interface StudentPublicDashboard {
  student: {
    id: string
    firstName: string
    lastName: string
    birthDate: string | null
    formation: string | null
    email: string | null
    phone: string | null
    parentFirstName: string | null
    parentLastName: string | null
    parentEmail: string | null
    parentPhone: string | null
    isMinor: boolean
  }
  class: { id: string; name: string; level: string } | null
  placement: {
    id: string
    status: string
    startDate: string | null
    endDate: string | null
  } | null
  company: {
    name: string
    address: string | null
    city: string | null
    zipCode: string | null
  } | null
  tutor: {
    firstName: string
    lastName: string
    function: string | null
    email: string | null
    phone: string | null
  } | null
  convention: StudentPublicConvention | null
}

export interface StudentPublicConvention {
  id: string
  name: string
  status: string
  generatedDocumentId: string | null
  signatureStatus: string | null
  downloadUrl: string | null
  finalDownloadUrl: string | null
  signatures: Array<{
    role: SignerRole
    name: string | null
    email: string
    status: SignatureStatus
    signedAt: string | null
  }>
  canRequestParentSignature: boolean
  canRequestTutorSignature: boolean
}

interface ValidateStudentCodeInput {
  code: string
}

interface StudentDashboardInput {
  studentId: string
}

interface UpdateStudentGuardianInput {
  studentId: string
  birthDate: string | null
  parentFirstName: string | null
  parentLastName: string | null
  parentEmail: string | null
  parentPhone: string | null
}

interface RequestStudentConventionSignatureInput {
  studentId: string
  documentId: string
  target: 'parent' | 'tutor'
}

type AdminClient = SupabaseClient

export const validateStudentCode = createServerFn({ method: 'POST' })
  .inputValidator(validateStudentCodeInput)
  .handler(async ({ data }): Promise<ValidateStudentCodeResult> => {
    const code = normalizeCode(data.code)
    if (!code) return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })

    const adminClient = createAdminClient()
    const codeRow = await findAccessCodeByHash(adminClient, hashAccessCode(code))
    if (!codeRow) return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })

    const inactiveError = getInactiveCodeError(codeRow)
    if (inactiveError) return sanitizeForSeroval({ ok: false, error: inactiveError })

    const student = await fetchStudent(adminClient, codeRow.student_id)
    if (!student || student.archived_at) {
      return sanitizeForSeroval({ ok: false, error: 'CODE_INVALID' })
    }

    const [klass, establishment] = await Promise.all([
      student.class_id ? fetchClass(adminClient, student.class_id) : Promise.resolve(null),
      fetchEstablishment(adminClient, student.establishment_id),
    ])

    const validatedAt = new Date().toISOString()
    await markCodeUsed(adminClient, codeRow.id, validatedAt)
    await insertAuditLog(adminClient, {
      establishmentId: student.establishment_id,
      action: 'student_portal.code_validated',
      description: `Code eleve valide pour ${student.first_name} ${student.last_name}`,
      metadata: {
        student_id: student.id,
        class_id: klass?.id ?? null,
        code_hint: codeRow.code_hint,
        source: 'server.student_portal',
      },
    })

    return sanitizeForSeroval({
      ok: true,
      session: {
        studentId: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        className: klass?.name ?? 'Classe non renseignee',
        classId: klass?.id ?? '',
        establishmentName: establishment?.name ?? 'Etablissement',
        validatedAt,
      },
    })
  })

export const getStudentPublicDashboard = createServerFn({ method: 'POST' })
  .inputValidator(validateStudentDashboardInput)
  .handler(async ({ data }): Promise<StudentPublicDashboard | null> => {
    const adminClient = createAdminClient()
    const code = await findActiveCodeForStudent(adminClient, data.studentId)
    if (!code || getInactiveCodeError(code)) return sanitizeForSeroval(null)

    const student = await fetchStudent(adminClient, data.studentId)
    if (!student || student.archived_at) return sanitizeForSeroval(null)

    const [klass, placement] = await Promise.all([
      student.class_id ? fetchClass(adminClient, student.class_id) : Promise.resolve(null),
      fetchLatestPlacement(adminClient, student.id),
    ])

    const [company, tutor, convention] = await Promise.all([
      placement?.company_id ? fetchCompany(adminClient, placement.company_id) : Promise.resolve(null),
      placement?.tutor_id ? fetchTutor(adminClient, placement.tutor_id) : Promise.resolve(null),
      fetchLatestConvention(adminClient, student.id, placement?.id ?? null),
    ])
    const isMinor = isStudentMinor(student)
    if (convention?.generatedDocumentId) {
      convention.canRequestParentSignature = isMinor && Boolean(student.parent_email)
      convention.canRequestTutorSignature = Boolean(tutor?.email)
    }

    return sanitizeForSeroval({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        birthDate: student.birth_date ?? null,
        formation: student.formation,
        email: student.email,
        phone: student.phone,
        parentFirstName: student.parent_first_name ?? null,
        parentLastName: student.parent_last_name ?? null,
        parentEmail: student.parent_email ?? null,
        parentPhone: student.parent_phone ?? null,
        isMinor,
      },
      class: klass
        ? {
            id: klass.id,
            name: klass.name,
            level: klass.level,
          }
        : null,
      placement: placement
        ? {
            id: placement.id,
            status: placement.status,
            startDate: placement.start_date,
            endDate: placement.end_date,
          }
        : null,
      company: company
        ? {
            name: company.name,
            address: company.address,
            city: company.city,
            zipCode: company.zip_code,
          }
        : null,
      tutor: tutor
        ? {
            firstName: tutor.first_name,
            lastName: tutor.last_name,
            function: tutor.function,
            email: tutor.email,
            phone: tutor.phone,
          }
        : null,
      convention,
    })
  })

export const updateStudentGuardianContact = createServerFn({ method: 'POST' })
  .inputValidator(validateGuardianInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const adminClient = createAdminClient()
    const student = await assertStudentPortalSession(adminClient, data.studentId)
    const birthDate = normalizeDate(data.birthDate)
    const parentEmail = normalizeNullableEmail(data.parentEmail)
    const { error } = await adminClient
      .from('students')
      .update({
        birth_date: birthDate,
        parent_first_name: clean(data.parentFirstName),
        parent_last_name: clean(data.parentLastName),
        parent_email: parentEmail,
        parent_phone: clean(data.parentPhone),
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
    if (error) throw new Error(`Mise a jour responsable legal impossible: ${error.message}`)

    await insertAuditLog(adminClient, {
      establishmentId: student.establishment_id,
      action: 'student_portal.guardian_updated',
      description: `Coordonnees responsable legal mises a jour par ${student.first_name} ${student.last_name}`,
      metadata: { student_id: student.id, source: 'server.student_portal' },
    })
    return sanitizeForSeroval({ ok: true })
  })

export const requestStudentConventionSignature = createServerFn({ method: 'POST' })
  .inputValidator(validateSignatureRequestInput)
  .handler(async ({ data }): Promise<{ ok: true; recipientEmail: string; recipientRole: string }> => {
    const adminClient = createAdminClient()
    const student = await assertStudentPortalSession(adminClient, data.studentId)
    const document = await fetchStudentConventionById(adminClient, student.id, data.documentId)
    if (!document.generated_document_id) throw new Error('La convention PDF doit etre generee par l etablissement avant l envoi en signature.')
    const generated = await fetchGeneratedDocument(adminClient, document.generated_document_id)
    const placement = document.placement_id ? await fetchPlacement(adminClient, document.placement_id) : await fetchLatestPlacement(adminClient, student.id)
    const tutor = placement?.tutor_id ? await fetchTutor(adminClient, placement.tutor_id) : null
    const signer = resolveStudentRequestedSigner(student, tutor, data.target)
    const token = generateMagicLinkToken()
    const tokenHash = hashMagicLinkToken(token)
    const ttlDays = Number(process.env.SIGNATURE_MAGIC_LINK_TTL_DAYS ?? '30')
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
    const signature = await createOrRefreshStudentSignature(adminClient, {
      document,
      generated,
      student,
      tutor,
      signer,
      tokenHash,
      expiresAt,
    })
    const baseUrl = process.env.SIGNATURE_MAGIC_LINK_BASE_URL ?? 'https://www.pfmp-pilot.fr/sign'
    await sendSignatureRequestEmail({
      to: signer.email,
      signerName: signer.name,
      magicLink: `${baseUrl}/${token}`,
      docName: document.name,
      role: signer.role,
    })
    await recordStudentSignatureEmail(adminClient, document, signature.id, signer, tokenHash)
    await adminClient
      .from('generated_documents')
      .update({ signature_status: generated.signature_status === 'fully_signed' ? 'fully_signed' : 'pending_signatures' })
      .eq('id', generated.id)
    await adminClient
      .from('documents')
      .update({ status: document.status === 'signed' ? 'signed' : 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', document.id)
    await insertAuditLog(adminClient, {
      establishmentId: student.establishment_id,
      action: 'student_portal.signature_requested',
      description: `Lien signature ${signer.role} envoye depuis le portail eleve`,
      metadata: { student_id: student.id, document_id: document.id, signature_id: signature.id, signer_role: signer.role },
    })
    return sanitizeForSeroval({ ok: true, recipientEmail: signer.email, recipientRole: signer.role })
  })

function validateStudentCodeInput(raw: unknown): ValidateStudentCodeInput {
  const data = raw as Partial<ValidateStudentCodeInput>
  return { code: typeof data.code === 'string' ? data.code : '' }
}

function validateStudentDashboardInput(raw: unknown): StudentDashboardInput {
  const data = raw as Partial<StudentDashboardInput>
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : ''
  if (!isUuid(studentId)) throw new Error('Eleve invalide.')
  return { studentId }
}

function validateGuardianInput(raw: unknown): UpdateStudentGuardianInput {
  const data = raw as Partial<UpdateStudentGuardianInput>
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : ''
  if (!isUuid(studentId)) throw new Error('Eleve invalide.')
  return {
    studentId,
    birthDate: nullableString(data.birthDate),
    parentFirstName: nullableString(data.parentFirstName),
    parentLastName: nullableString(data.parentLastName),
    parentEmail: nullableString(data.parentEmail),
    parentPhone: nullableString(data.parentPhone),
  }
}

function validateSignatureRequestInput(raw: unknown): RequestStudentConventionSignatureInput {
  const data = raw as Partial<RequestStudentConventionSignatureInput>
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : ''
  const documentId = typeof data.documentId === 'string' ? data.documentId.trim() : ''
  if (!isUuid(studentId)) throw new Error('Eleve invalide.')
  if (!isUuid(documentId)) throw new Error('Convention invalide.')
  if (data.target !== 'parent' && data.target !== 'tutor') throw new Error('Signataire invalide.')
  return { studentId, documentId, target: data.target }
}

function createAdminClient(): AdminClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL manquant cote serveur.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant cote serveur Vercel.')

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function findAccessCodeByHash(
  adminClient: AdminClient,
  codeHash: string,
): Promise<StudentAccessCodeRow | null> {
  const { data, error } = await adminClient
    .from('student_access_codes')
    .select('*')
    .eq('code_hash', codeHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Verification code eleve impossible: ${error.message}`)
  return (data as unknown as StudentAccessCodeRow | null) ?? null
}

async function findActiveCodeForStudent(
  adminClient: AdminClient,
  studentId: string,
): Promise<StudentAccessCodeRow | null> {
  const { data, error } = await adminClient
    .from('student_access_codes')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture code eleve impossible: ${error.message}`)
  return (data as unknown as StudentAccessCodeRow | null) ?? null
}

async function fetchStudent(adminClient: AdminClient, studentId: string): Promise<StudentRow | null> {
  const { data, error } = await adminClient
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture eleve impossible: ${error.message}`)
  return (data as unknown as StudentRow | null) ?? null
}

async function fetchClass(adminClient: AdminClient, classId: string): Promise<ClassRow | null> {
  const { data, error } = await adminClient
    .from('classes')
    .select('*')
    .eq('id', classId)
    .maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  return (data as unknown as ClassRow | null) ?? null
}

async function fetchEstablishment(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<EstablishmentRow | null> {
  const { data, error } = await adminClient
    .from('establishments')
    .select('*')
    .eq('id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture etablissement impossible: ${error.message}`)
  return (data as unknown as EstablishmentRow | null) ?? null
}

async function fetchLatestPlacement(
  adminClient: AdminClient,
  studentId: string,
): Promise<PlacementRow | null> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture stage impossible: ${error.message}`)
  return (data as unknown as PlacementRow | null) ?? null
}

async function fetchCompany(adminClient: AdminClient, companyId: string): Promise<CompanyRow | null> {
  const { data, error } = await adminClient
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle()
  if (error) throw new Error(`Lecture entreprise impossible: ${error.message}`)
  return (data as unknown as CompanyRow | null) ?? null
}

async function fetchTutor(adminClient: AdminClient, tutorId: string): Promise<TutorRow | null> {
  const { data, error } = await adminClient
    .from('tutors')
    .select('*')
    .eq('id', tutorId)
    .maybeSingle()
  if (error) throw new Error(`Lecture tuteur impossible: ${error.message}`)
  return (data as unknown as TutorRow | null) ?? null
}

async function fetchLatestConvention(
  adminClient: AdminClient,
  studentId: string,
  placementId: string | null,
): Promise<StudentPublicConvention | null> {
  let query = adminClient
    .from('documents')
    .select('*')
    .eq('student_id', studentId)
    .eq('type', 'convention')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (placementId) query = query.eq('placement_id', placementId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Lecture convention eleve impossible: ${error.message}`)
  const document = (data as unknown as DocumentRow | null) ?? null
  if (!document) return null

  const generated = document.generated_document_id
    ? await fetchGeneratedDocument(adminClient, document.generated_document_id)
    : null
  const signatures = generated ? await fetchDocumentSignatures(adminClient, generated.id) : []
  const downloadUrl = generated?.storage_path ? await createPdfSignedUrl(adminClient, generated.storage_path) : null
  const finalDownloadUrl = generated?.final_signed_pdf_url
    ? await createPdfSignedUrl(adminClient, generated.final_signed_pdf_url)
    : null

  return {
    id: document.id,
    name: document.name,
    status: document.status,
    generatedDocumentId: generated?.id ?? null,
    signatureStatus: generated?.signature_status ?? null,
    downloadUrl,
    finalDownloadUrl,
    signatures: signatures.map((signature) => ({
      role: signature.signer_role,
      name: signature.signer_name,
      email: signature.signer_email,
      status: signature.status,
      signedAt: signature.signed_at,
    })),
    canRequestParentSignature: false,
    canRequestTutorSignature: false,
  }
}

async function fetchStudentConventionById(
  adminClient: AdminClient,
  studentId: string,
  documentId: string,
): Promise<DocumentRow> {
  const { data, error } = await adminClient
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('student_id', studentId)
    .eq('type', 'convention')
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(`Lecture convention impossible: ${error.message}`)
  if (!data) throw new Error('Convention introuvable dans votre espace eleve.')
  return data as unknown as DocumentRow
}

async function fetchGeneratedDocument(
  adminClient: AdminClient,
  generatedDocumentId: string,
): Promise<GeneratedDocumentRow> {
  const { data, error } = await adminClient
    .from('generated_documents')
    .select('*')
    .eq('id', generatedDocumentId)
    .maybeSingle()
  if (error) throw new Error(`Lecture PDF convention impossible: ${error.message}`)
  if (!data) throw new Error('PDF convention introuvable.')
  return data as unknown as GeneratedDocumentRow
}

async function fetchDocumentSignatures(
  adminClient: AdminClient,
  generatedDocumentId: string,
): Promise<DocumentSignatureRow[]> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('generated_document_id', generatedDocumentId)
    .order('signing_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Lecture signatures convention impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow[]) ?? []
}

async function fetchPlacement(adminClient: AdminClient, placementId: string): Promise<PlacementRow | null> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('id', placementId)
    .maybeSingle()
  if (error) throw new Error(`Lecture dossier PFMP impossible: ${error.message}`)
  return (data as unknown as PlacementRow | null) ?? null
}

async function createPdfSignedUrl(adminClient: AdminClient, storagePath: string): Promise<string | null> {
  const bucket = process.env.GENERATED_PDFS_BUCKET ?? 'generated-pdfs'
  const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(storagePath, 60 * 10)
  if (error) return null
  return data.signedUrl
}

async function assertStudentPortalSession(adminClient: AdminClient, studentId: string): Promise<StudentRow> {
  const code = await findActiveCodeForStudent(adminClient, studentId)
  if (!code || getInactiveCodeError(code)) throw new Error('Session eleve expiree. Reconnectez-vous avec votre code.')
  const student = await fetchStudent(adminClient, studentId)
  if (!student || student.archived_at) throw new Error('Eleve introuvable.')
  return student
}

function resolveStudentRequestedSigner(
  student: StudentRow,
  tutor: TutorRow | null,
  target: 'parent' | 'tutor',
): { role: SignerRole; name: string; email: string; phone: string | null; tutorId: string | null; studentId: string | null } {
  if (target === 'parent') {
    if (!isStudentMinor(student)) throw new Error('La signature parent est requise uniquement pour un eleve mineur.')
    const email = normalizeNullableEmail(student.parent_email)
    if (!email) throw new Error('Email du responsable legal obligatoire.')
    return {
      role: 'parent',
      name: [student.parent_first_name, student.parent_last_name].filter(Boolean).join(' ') || 'Responsable legal',
      email,
      phone: student.parent_phone ?? null,
      tutorId: null,
      studentId: student.id,
    }
  }
  if (!tutor) throw new Error('Aucun tuteur entreprise rattache au dossier PFMP.')
  const email = normalizeNullableEmail(tutor.email)
  if (!email) throw new Error('Email du tuteur entreprise obligatoire.')
  return {
    role: 'tutor',
    name: `${tutor.first_name} ${tutor.last_name}`.trim(),
    email,
    phone: tutor.phone,
    tutorId: tutor.id,
    studentId: null,
  }
}

async function createOrRefreshStudentSignature(
  adminClient: AdminClient,
  input: {
    document: DocumentRow
    generated: GeneratedDocumentRow
    student: StudentRow
    tutor: TutorRow | null
    signer: ReturnType<typeof resolveStudentRequestedSigner>
    tokenHash: string
    expiresAt: string
  },
): Promise<DocumentSignatureRow> {
  const existing = await findExistingStudentSignature(adminClient, input.generated.id, input.signer.role, input.signer.email)
  const documentHash = input.generated.sha256_hex ?? input.generated.final_signed_sha256_hex ?? computeDocumentHash(input.generated.id)
  const payload = {
    signer_name: input.signer.name,
    signer_email: input.signer.email,
    signer_role: input.signer.role,
    signer_tutor_id: input.signer.tutorId,
    signer_student_id: input.signer.studentId,
    signer_phone: input.signer.phone,
    status: 'sent',
    sent_at: new Date().toISOString(),
    signature_method: 'click_to_sign',
    document_hash: documentHash,
    magic_link_token_hash: input.tokenHash,
    magic_link_expires_at: input.expiresAt,
    magic_link_used_at: null,
  }
  if (existing) {
    if (existing.status === 'signed') throw new Error('Cette signature est deja enregistree.')
    const { data, error } = await adminClient
      .from('document_signatures')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(`Relance signature impossible: ${error.message}`)
    return data as unknown as DocumentSignatureRow
  }
  const { data, error } = await adminClient
    .from('document_signatures')
    .insert({
      establishment_id: input.document.establishment_id,
      document_id: input.document.id,
      generated_document_id: input.generated.id,
      signer_user_id: null,
      signing_order: input.signer.role === 'parent' ? 2 : 1,
      ...payload,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation demande signature impossible: ${error.message}`)
  return data as unknown as DocumentSignatureRow
}

async function findExistingStudentSignature(
  adminClient: AdminClient,
  generatedDocumentId: string,
  role: SignerRole,
  email: string,
): Promise<DocumentSignatureRow | null> {
  const { data, error } = await adminClient
    .from('document_signatures')
    .select('*')
    .eq('generated_document_id', generatedDocumentId)
    .eq('signer_role', role)
    .eq('signer_email', email)
    .maybeSingle()
  if (error) throw new Error(`Lecture signature existante impossible: ${error.message}`)
  return (data as unknown as DocumentSignatureRow | null) ?? null
}

async function recordStudentSignatureEmail(
  adminClient: AdminClient,
  document: DocumentRow,
  signatureId: string,
  signer: ReturnType<typeof resolveStudentRequestedSigner>,
  tokenHash: string,
): Promise<void> {
  const { error } = await adminClient.from('signature_request_emails').insert({
    establishment_id: document.establishment_id,
    document_id: document.id,
    signature_id: signatureId,
    signer_email: signer.email,
    signer_role: signer.role,
    token_hash: tokenHash,
  })
  if (error) throw new Error(`Journal email signature impossible: ${error.message}`)
}

async function markCodeUsed(
  adminClient: AdminClient,
  codeId: string,
  usedAt: string,
): Promise<void> {
  const { error } = await adminClient
    .from('student_access_codes')
    .update({ last_used_at: usedAt, updated_at: usedAt })
    .eq('id', codeId)
  if (error) throw new Error(`Mise a jour code eleve impossible: ${error.message}`)
}

async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    establishmentId: string | null
    action: string
    description: string
    metadata: Json
  },
): Promise<void> {
  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: null,
    action: input.action,
    description: input.description,
    metadata: input.metadata,
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}

function getInactiveCodeError(code: StudentAccessCodeRow): StudentCodeError | null {
  if (code.status === 'revoked') return 'CODE_REVOKED'
  if (code.status === 'expired') return 'CODE_EXPIRED'
  if (code.expires_at && new Date(code.expires_at).getTime() <= Date.now()) return 'CODE_EXPIRED'
  if (code.status !== 'active') return 'CODE_INVALID'
  return null
}

function hashAccessCode(code: string): string {
  const pepper = process.env.STUDENT_ACCESS_CODE_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHash('sha256')
    .update(`${pepper}:${normalizeCode(code)}`)
    .digest('hex')
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function nullableString(value: unknown): string | null {
  return clean(value)
}

function normalizeDate(value: string | null): string | null {
  const text = clean(value)
  if (!text) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Date de naissance invalide.')
  return text
}

function normalizeNullableEmail(value: unknown): string | null {
  const email = clean(value)?.toLowerCase() ?? null
  if (!email) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Email invalide: ${email}`)
  return email
}

function isStudentMinor(student: StudentRow): boolean {
  if (!student.birth_date) return false
  const limit = new Date()
  limit.setFullYear(limit.getFullYear() - 18)
  return new Date(student.birth_date).getTime() > limit.getTime()
}

function sanitizeForSeroval<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value))) as T
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
