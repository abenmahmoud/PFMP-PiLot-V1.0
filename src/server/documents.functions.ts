import { createServerFn } from '@tanstack/react-start'
import type {
  ClassDocumentTemplateAssignmentRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  DocumentTemplateFieldRow,
  DocumentTemplateRow,
  DocumentTemplateSourceKind,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StudentRow,
  TutorRow,
  UserRole,
} from '@/lib/database.types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const TEMPLATE_SOURCE_BUCKET = 'documents-private'

declare const process: {
  env: Record<string, string | undefined>
}

export interface ConventionDocumentSyncResult {
  ok: true
  periodId: string
  placements: number
  created: number
  updated: number
  templateId: string
}

export interface ConventionTemplateInput {
  name: string
  bodyMarkdown: string
  sourceFilename?: string | null
}

export interface ConventionTemplateSourceInput {
  name: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  sourceBase64: string | null
  extractedText: string | null
  sourceKind: DocumentTemplateSourceKind | null
}

export interface ConventionTemplateSourceAnalysisResult {
  template: DocumentTemplateRow
  fields: DocumentTemplateFieldRow[]
  sourceStored: boolean
  analysisSource: 'claude' | 'heuristic'
  warnings: string[]
}

export interface ClassConventionTemplateAssignment {
  class: ClassRow
  assignment: ClassDocumentTemplateAssignmentRow | null
  template: DocumentTemplateRow | null
}

export const listDocumentTemplatesForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListTemplatesInput)
  .handler(async ({ data }): Promise<DocumentTemplateRow[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const { data: rows, error } = await adminClient
        .from('document_templates')
        .select('*')
        .or(`establishment_id.is.null,establishment_id.eq.${establishmentId}`)
        .eq('active', true)
        .order('establishment_id', { ascending: false, nullsFirst: false })
        .order('type')
        .order('version', { ascending: false })
      if (error) throw new Error(`Lecture modeles documents impossible: ${error.message}`)
      return ((rows as unknown as DocumentTemplateRow[]) ?? []).map(sanitizeTemplate)
    })
  })

export const saveConventionTemplate = createServerFn({ method: 'POST' })
  .inputValidator(validateSaveTemplateInput)
  .handler(async ({ data }): Promise<DocumentTemplateRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageDocuments(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const now = new Date().toISOString()
      const { data: row, error } = await adminClient
        .from('document_templates')
        .insert({
          establishment_id: establishmentId,
          type: 'convention',
          name: data.template.name,
          description: 'Modele de convention PFMP propre a cet etablissement.',
          body_markdown: data.template.bodyMarkdown,
          body_html: null,
          variables: DEFAULT_CONVENTION_VARIABLES,
          active: true,
          version: 1,
          source_filename: data.template.sourceFilename ?? null,
          source_kind: data.template.sourceFilename ? 'docx_import' : 'manual',
          ai_mapping: buildAiMappingDraft(data.template.bodyMarkdown),
          is_default: false,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()
      if (error) throw new Error(`Enregistrement modele convention impossible: ${error.message}`)
      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'document_template.saved',
        description: 'Modele convention PFMP enregistre',
        metadata: { type: 'convention', source: 'server.documents' },
      })
      return sanitizeTemplate(row as unknown as DocumentTemplateRow)
    })
  })

export const analyzeConventionTemplateSource = createServerFn({ method: 'POST' })
  .inputValidator(validateAnalyzeSourceInput)
  .handler(async ({ data }): Promise<ConventionTemplateSourceAnalysisResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageDocuments(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const now = new Date().toISOString()
      const sourceKind = data.source.sourceKind ?? inferSourceKind(data.source.fileName, data.source.mimeType)
      const analysis = await analyzeSourceFields(data.source)
      const bodyMarkdown = buildTemplateDraftFromFields(data.source, analysis.fields)

      const { data: row, error } = await adminClient
        .from('document_templates')
        .insert({
          establishment_id: establishmentId,
          type: 'convention',
          name: data.source.name,
          description: `Modele importe depuis ${data.source.fileName}. Validation humaine requise avant usage officiel.`,
          body_markdown: bodyMarkdown,
          body_html: null,
          variables: DEFAULT_CONVENTION_VARIABLES,
          active: true,
          version: 1,
          source_filename: data.source.fileName,
          source_kind: sourceKind,
          source_mime_type: data.source.mimeType,
          source_size_bytes: data.source.fileSizeBytes,
          source_storage_path: null,
          analysis_status: analysis.fields.length > 0 ? 'needs_review' : 'failed',
          analysis_notes: analysis.summary,
          field_count: analysis.fields.length,
          requires_human_review: true,
          ai_mapping: {
            source: analysis.source,
            summary: analysis.summary,
            warnings: analysis.warnings,
            detected_variables: analysis.fields.map((field) => field.field_key),
            ready_for_review: analysis.fields.length > 0,
          },
          is_default: false,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()
      if (error) throw new Error(`Creation modele depuis source impossible: ${error.message}`)

      const template = row as unknown as DocumentTemplateRow
      const upload = await uploadTemplateSource(adminClient, establishmentId, template.id, data.source)
      const warnings = [...analysis.warnings]
      if (upload.warning) warnings.push(upload.warning)

      if (upload.path) {
        const { error: updateError } = await adminClient
          .from('document_templates')
          .update({ source_storage_path: upload.path, updated_at: now })
          .eq('id', template.id)
        if (updateError) warnings.push(`Source creee mais chemin non sauvegarde: ${updateError.message}`)
        template.source_storage_path = upload.path
      }

      const fields = await insertTemplateFields(adminClient, establishmentId, template.id, analysis.fields, now)
      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'document_template.source_analyzed',
        description: `Source documentaire analysee: ${data.source.fileName}`,
        metadata: {
          template_id: template.id,
          file_name: data.source.fileName,
          source_kind: sourceKind,
          field_count: fields.length,
          analysis_source: analysis.source,
          source_stored: Boolean(upload.path),
        },
      })

      return {
        template: sanitizeTemplate(template),
        fields,
        sourceStored: Boolean(upload.path),
        analysisSource: analysis.source,
        warnings,
      }
    })
  })

export const listDocumentTemplateFields = createServerFn({ method: 'POST' })
  .inputValidator(validateListTemplateFieldsInput)
  .handler(async ({ data }): Promise<DocumentTemplateFieldRow[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const template = await getTemplate(adminClient, data.templateId)
      if (template.establishment_id && template.establishment_id !== establishmentId) {
        throw new Error('Modele hors etablissement actif.')
      }
      const { data: rows, error } = await adminClient
        .from('document_template_fields')
        .select('*')
        .eq('template_id', data.templateId)
        .order('role')
        .order('field_key')
      if (error) throw new Error(`Lecture champs modele impossible: ${error.message}`)
      return (rows as unknown as DocumentTemplateFieldRow[]) ?? []
    })
  })

export const listClassConventionTemplateAssignments = createServerFn({ method: 'POST' })
  .inputValidator(validateListTemplatesInput)
  .handler(async ({ data }): Promise<ClassConventionTemplateAssignment[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const [classes, assignments, templates] = await Promise.all([
        listClasses(adminClient, establishmentId),
        listActiveClassTemplateAssignments(adminClient, establishmentId),
        listConventionTemplates(adminClient, establishmentId),
      ])
      const assignmentByClass = new Map(assignments.map((assignment) => [assignment.class_id, assignment]))
      const templateById = indexById(templates)
      return classes.map((klass) => {
        const assignment = assignmentByClass.get(klass.id) ?? null
        return {
          class: klass,
          assignment,
          template: assignment ? templateById.get(assignment.template_id) ?? null : null,
        }
      })
    })
  })

export const assignConventionTemplateToClass = createServerFn({ method: 'POST' })
  .inputValidator(validateAssignTemplateInput)
  .handler(async ({ data }): Promise<ClassConventionTemplateAssignment> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageDocuments(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const klass = await getClass(adminClient, data.classId)
      if (klass.establishment_id !== establishmentId) throw new Error('Classe hors etablissement actif.')
      const template = await getTemplate(adminClient, data.templateId)
      if (template.type !== 'convention' || !template.active) throw new Error('Modele de convention invalide.')
      if (template.establishment_id && template.establishment_id !== establishmentId) {
        throw new Error('Modele hors etablissement actif.')
      }

      const now = new Date().toISOString()
      const { error: deactivateError } = await adminClient
        .from('class_document_template_assignments')
        .update({ active: false, updated_at: now })
        .eq('class_id', klass.id)
        .eq('type', 'convention')
        .eq('active', true)
      if (deactivateError) throw new Error(`Desactivation ancienne affectation impossible: ${deactivateError.message}`)

      const { data: assignmentRow, error } = await adminClient
        .from('class_document_template_assignments')
        .insert({
          establishment_id: establishmentId,
          class_id: klass.id,
          template_id: template.id,
          type: 'convention',
          active: true,
          assigned_by: caller.id,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()
      if (error) throw new Error(`Affectation modele classe impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'document_template.assigned_to_class',
        description: `Modele convention affecte a la classe ${klass.name}`,
        metadata: { class_id: klass.id, template_id: template.id, source: 'server.documents' },
      })

      return {
        class: klass,
        assignment: assignmentRow as unknown as ClassDocumentTemplateAssignmentRow,
        template: sanitizeTemplate(template),
      }
    })
  })

export const clearConventionTemplateForClass = createServerFn({ method: 'POST' })
  .inputValidator(validateClearTemplateAssignmentInput)
  .handler(async ({ data }): Promise<{ ok: true; classId: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageDocuments(caller)
      const establishmentId = resolveRequestedEstablishment(caller, data.establishmentId)
      const klass = await getClass(adminClient, data.classId)
      if (klass.establishment_id !== establishmentId) throw new Error('Classe hors etablissement actif.')
      const { error } = await adminClient
        .from('class_document_template_assignments')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('class_id', klass.id)
        .eq('type', 'convention')
        .eq('active', true)
      if (error) throw new Error(`Retrait affectation modele impossible: ${error.message}`)
      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'document_template.unassigned_from_class',
        description: `Modele convention retire de la classe ${klass.name}`,
        metadata: { class_id: klass.id, source: 'server.documents' },
      })
      return { ok: true, classId: klass.id }
    })
  })

export const ensureConventionDocumentsForPeriod = createServerFn({ method: 'POST' })
  .inputValidator(validateEnsureConventionInput)
  .handler(async ({ data }): Promise<ConventionDocumentSyncResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      const result = await ensureConventionDocumentsForPeriodInternal(
        adminClient,
        caller,
        data.periodId,
        data.establishmentId,
      )
      await insertAuditLog(adminClient, {
        establishmentId: resolveRequestedEstablishment(caller, data.establishmentId),
        userId: caller.id,
        action: 'documents.conventions_synced',
        description: `Conventions PFMP preparees: ${result.created} creees, ${result.updated} mises a jour`,
        metadata: { period_id: data.periodId, created: result.created, updated: result.updated, source: 'server.documents' },
      })
      return result
    })
  })

export async function ensureConventionDocumentsForPeriodInternal(
  adminClient: AdminClient,
  caller: ProfileRow,
  periodId: string,
  requestedEstablishmentId?: string | null,
): Promise<ConventionDocumentSyncResult> {
  assertCanManageDocuments(caller)
  const period = await getPeriod(adminClient, periodId)
  assertSameTenant(caller, period.establishment_id, requestedEstablishmentId)
  const template = await resolveConventionTemplateForPeriod(adminClient, period)
  const placements = await listPeriodPlacements(adminClient, period)
  if (placements.length === 0) {
    return { ok: true, periodId: period.id, placements: 0, created: 0, updated: 0, templateId: template.id }
  }

  const [students, companies, tutors, existingDocuments] = await Promise.all([
    fetchStudents(adminClient, placements.map((placement) => placement.student_id)),
    fetchCompanies(adminClient, placements.map((placement) => placement.company_id)),
    fetchTutors(adminClient, placements.map((placement) => placement.tutor_id)),
    fetchExistingConventionDocuments(adminClient, placements.map((placement) => placement.id)),
  ])

  const studentById = indexById(students)
  const companyById = indexById(companies)
  const tutorById = indexById(tutors)
  const documentByPlacementId = new Map(existingDocuments.map((document) => [document.placement_id, document]))
  const now = new Date().toISOString()
  const inserts: Array<Partial<DocumentRow>> = []
  const updates: Array<Promise<unknown>> = []

  for (const placement of placements) {
    const student = studentById.get(placement.student_id)
    if (!student) continue
    const company = placement.company_id ? companyById.get(placement.company_id) ?? null : null
    const tutor = placement.tutor_id ? tutorById.get(placement.tutor_id) ?? null : null
    const existing = documentByPlacementId.get(placement.id)
    const name = `Convention ${student.first_name} ${student.last_name} - ${period.name}`
    const status = company ? 'draft' : 'missing'
    const common = {
      company_id: company?.id ?? null,
      template_id: template.id,
      name,
      status,
      updated_at: now,
    }

    if (!existing) {
      inserts.push({
        establishment_id: period.establishment_id,
        type: 'convention',
        student_id: student.id,
        period_id: period.id,
        company_id: company?.id ?? null,
        placement_id: placement.id,
        template_id: template.id,
        name,
        storage_path: null,
        status,
        author_id: caller.id,
        archived_at: null,
        created_at: now,
        updated_at: now,
      })
    } else if (
      existing.name !== name ||
      existing.company_id !== (company?.id ?? null) ||
      existing.template_id !== template.id ||
      (existing.status === 'missing' && status === 'draft')
    ) {
      updates.push(updateConventionDocument(adminClient, existing.id, common))
    }

    void tutor
  }

  if (inserts.length > 0) {
    const { error } = await adminClient.from('documents').insert(inserts)
    if (error) throw new Error(`Creation conventions impossible: ${error.message}`)
  }
  if (updates.length > 0) await Promise.all(updates)

  return {
    ok: true,
    periodId: period.id,
    placements: placements.length,
    created: inserts.length,
    updated: updates.length,
    templateId: template.id,
  }
}

async function getPeriod(adminClient: AdminClient, periodId: string): Promise<PfmpPeriodRow> {
  const { data, error } = await adminClient.from('pfmp_periods').select('*').eq('id', periodId).maybeSingle()
  if (error) throw new Error(`Lecture periode impossible: ${error.message}`)
  if (!data) throw new Error('Periode PFMP introuvable.')
  return data as unknown as PfmpPeriodRow
}

async function listPeriodPlacements(adminClient: AdminClient, period: PfmpPeriodRow): Promise<PlacementRow[]> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('establishment_id', period.establishment_id)
    .eq('period_id', period.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Lecture dossiers PFMP impossible: ${error.message}`)
  return (data as unknown as PlacementRow[]) ?? []
}

async function ensureConventionTemplate(adminClient: AdminClient, establishmentId: string): Promise<DocumentTemplateRow> {
  const { data: existing, error } = await adminClient
    .from('document_templates')
    .select('*')
    .eq('type', 'convention')
    .eq('active', true)
    .or(`establishment_id.eq.${establishmentId},establishment_id.is.null`)
    .order('establishment_id', { ascending: false, nullsFirst: false })
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Lecture modele convention impossible: ${error.message}`)
  if (existing) return sanitizeTemplate(existing as unknown as DocumentTemplateRow)

  const now = new Date().toISOString()
  const { data: created, error: insertError } = await adminClient
    .from('document_templates')
    .insert({
      establishment_id: establishmentId,
      type: 'convention',
      name: 'Convention PFMP - modele etablissement',
      description: 'Modele natif cree automatiquement. Les champs inconnus restent vierges.',
      body_markdown: DEFAULT_CONVENTION_TEMPLATE,
      body_html: null,
      variables: DEFAULT_CONVENTION_VARIABLES,
      active: true,
      version: 1,
      source_filename: null,
      source_kind: 'system',
      ai_mapping: buildAiMappingDraft(DEFAULT_CONVENTION_TEMPLATE),
      is_default: true,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()
  if (insertError) throw new Error(`Creation modele convention impossible: ${insertError.message}`)
  return sanitizeTemplate(created as unknown as DocumentTemplateRow)
}

async function resolveConventionTemplateForPeriod(adminClient: AdminClient, period: PfmpPeriodRow): Promise<DocumentTemplateRow> {
  if (period.class_id) {
    const { data, error } = await adminClient
      .from('class_document_template_assignments')
      .select('*')
      .eq('class_id', period.class_id)
      .eq('type', 'convention')
      .eq('active', true)
      .maybeSingle()
    if (error) throw new Error(`Lecture modele classe impossible: ${error.message}`)
    const assignment = data as unknown as ClassDocumentTemplateAssignmentRow | null
    if (assignment) {
      const template = await getTemplate(adminClient, assignment.template_id)
      if (template.active && template.type === 'convention') return sanitizeTemplate(template)
    }
  }
  return ensureConventionTemplate(adminClient, period.establishment_id)
}

async function listClasses(adminClient: AdminClient, establishmentId: string): Promise<ClassRow[]> {
  const { data, error } = await adminClient
    .from('classes')
    .select('*')
    .eq('establishment_id', establishmentId)
    .order('name')
  if (error) throw new Error(`Lecture classes impossible: ${error.message}`)
  return (data as unknown as ClassRow[]) ?? []
}

async function listActiveClassTemplateAssignments(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<ClassDocumentTemplateAssignmentRow[]> {
  const { data, error } = await adminClient
    .from('class_document_template_assignments')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('type', 'convention')
    .eq('active', true)
  if (error) throw new Error(`Lecture affectations modeles impossible: ${error.message}`)
  return (data as unknown as ClassDocumentTemplateAssignmentRow[]) ?? []
}

async function listConventionTemplates(adminClient: AdminClient, establishmentId: string): Promise<DocumentTemplateRow[]> {
  const { data, error } = await adminClient
    .from('document_templates')
    .select('*')
    .or(`establishment_id.is.null,establishment_id.eq.${establishmentId}`)
    .eq('type', 'convention')
    .eq('active', true)
    .order('establishment_id', { ascending: false, nullsFirst: false })
    .order('name')
  if (error) throw new Error(`Lecture modeles convention impossible: ${error.message}`)
  return ((data as unknown as DocumentTemplateRow[]) ?? []).map(sanitizeTemplate)
}

async function getClass(adminClient: AdminClient, classId: string): Promise<ClassRow> {
  const { data, error } = await adminClient.from('classes').select('*').eq('id', classId).maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  if (!data) throw new Error('Classe introuvable.')
  return data as unknown as ClassRow
}

async function getTemplate(adminClient: AdminClient, templateId: string): Promise<DocumentTemplateRow> {
  const { data, error } = await adminClient.from('document_templates').select('*').eq('id', templateId).maybeSingle()
  if (error) throw new Error(`Lecture modele impossible: ${error.message}`)
  if (!data) throw new Error('Modele introuvable.')
  return sanitizeTemplate(data as unknown as DocumentTemplateRow)
}

async function fetchStudents(adminClient: AdminClient, ids: string[]): Promise<StudentRow[]> {
  const uniqueIds = unique(ids)
  if (uniqueIds.length === 0) return []
  const { data, error } = await adminClient.from('students').select('*').in('id', uniqueIds)
  if (error) throw new Error(`Lecture eleves impossible: ${error.message}`)
  return (data as unknown as StudentRow[]) ?? []
}

async function fetchCompanies(adminClient: AdminClient, ids: Array<string | null>): Promise<CompanyRow[]> {
  const uniqueIds = unique(ids)
  if (uniqueIds.length === 0) return []
  const { data, error } = await adminClient.from('companies').select('*').in('id', uniqueIds)
  if (error) throw new Error(`Lecture entreprises impossible: ${error.message}`)
  return (data as unknown as CompanyRow[]) ?? []
}

async function fetchTutors(adminClient: AdminClient, ids: Array<string | null>): Promise<TutorRow[]> {
  const uniqueIds = unique(ids)
  if (uniqueIds.length === 0) return []
  const { data, error } = await adminClient.from('tutors').select('*').in('id', uniqueIds)
  if (error) throw new Error(`Lecture tuteurs impossible: ${error.message}`)
  return (data as unknown as TutorRow[]) ?? []
}

async function fetchExistingConventionDocuments(adminClient: AdminClient, placementIds: string[]): Promise<DocumentRow[]> {
  const uniqueIds = unique(placementIds)
  if (uniqueIds.length === 0) return []
  const { data, error } = await adminClient
    .from('documents')
    .select('*')
    .eq('type', 'convention')
    .in('placement_id', uniqueIds)
    .is('archived_at', null)
  if (error) throw new Error(`Lecture conventions existantes impossible: ${error.message}`)
  return (data as unknown as DocumentRow[]) ?? []
}

async function updateConventionDocument(
  adminClient: AdminClient,
  documentId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await adminClient.from('documents').update(data).eq('id', documentId)
  if (error) throw new Error(`Mise a jour convention impossible: ${error.message}`)
}

function assertCanManageDocuments(caller: ProfileRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) throw new Error('Acces refuse: documents reserves admin/DDFPT.')
}

function resolveRequestedEstablishment(caller: ProfileRow, requested?: string | null): string {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ?? caller.establishment_id
    if (!establishmentId) throw new Error('Etablissement actif requis.')
    return establishmentId
  }
  if (!caller.establishment_id) throw new Error('Etablissement appelant introuvable.')
  if (requested && requested !== caller.establishment_id) throw new Error('Acces refuse: etablissement hors tenant.')
  return caller.establishment_id
}

function assertSameTenant(caller: ProfileRow, establishmentId: string, requested?: string | null): void {
  const resolved = resolveRequestedEstablishment(caller, requested)
  if (resolved !== establishmentId) throw new Error('Acces refuse: document hors tenant.')
}

function validateListTemplatesInput(data: unknown): { accessToken: string; establishmentId: string | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
  }
}

function validateEnsureConventionInput(data: unknown): { accessToken: string; establishmentId: string | null; periodId: string } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    periodId: validateUuid(record.periodId, 'Periode'),
  }
}

function validateSaveTemplateInput(data: unknown): { accessToken: string; establishmentId: string | null; template: ConventionTemplateInput } {
  const record = asRecord(data)
  const template = asRecord(record.template)
  const name = requiredString(template.name, 'Nom modele')
  const bodyMarkdown = requiredString(template.bodyMarkdown, 'Contenu modele')
  if (bodyMarkdown.length < 80) throw new Error('Le modele de convention est trop court.')
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    template: { name, bodyMarkdown, sourceFilename: clean(template.sourceFilename) || null },
  }
}

function validateAnalyzeSourceInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  source: ConventionTemplateSourceInput
} {
  const record = asRecord(data)
  const source = asRecord(record.source)
  const fileName = requiredString(source.fileName, 'Nom du fichier').slice(0, 240)
  const mimeType = clean(source.mimeType) || inferMimeType(fileName)
  const fileSizeBytes = Number(source.fileSizeBytes)
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes < 0) throw new Error('Taille du fichier invalide.')
  if (fileSizeBytes > 8_000_000) throw new Error('Fichier trop volumineux: limite 8 Mo pour cette analyse.')
  const sourceBase64 = normalizeBase64(clean(source.sourceBase64))
  const extractedText = clean(source.extractedText).slice(0, 50_000) || null
  const sourceKind = normalizeSourceKind(source.sourceKind, fileName, mimeType)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    source: {
      name: requiredString(source.name, 'Nom du modele').slice(0, 160),
      fileName,
      mimeType,
      fileSizeBytes,
      sourceBase64,
      extractedText,
      sourceKind,
    },
  }
}

function validateListTemplateFieldsInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  templateId: string
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    templateId: validateUuid(record.templateId, 'Modele'),
  }
}

function validateAssignTemplateInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  classId: string
  templateId: string
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    classId: validateUuid(record.classId, 'Classe'),
    templateId: validateUuid(record.templateId, 'Modele'),
  }
}

function validateClearTemplateAssignmentInput(data: unknown): {
  accessToken: string
  establishmentId: string | null
  classId: string
} {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Token'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    classId: validateUuid(record.classId, 'Classe'),
  }
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} requis.`)
  return text
}

function optionalUuid(value: unknown, label: string): string | null {
  const text = clean(value)
  return text ? validateUuid(text, label) : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function sanitizeTemplate(template: DocumentTemplateRow): DocumentTemplateRow {
  const normalized = {
    ...template,
    source_filename: template.source_filename ?? null,
    source_kind: template.source_kind ?? 'manual',
    source_storage_path: template.source_storage_path ?? null,
    source_mime_type: template.source_mime_type ?? null,
    source_size_bytes: template.source_size_bytes ?? null,
    analysis_status: template.analysis_status ?? 'not_analyzed',
    analysis_notes: template.analysis_notes ?? null,
    field_count: template.field_count ?? 0,
    requires_human_review: template.requires_human_review ?? true,
    ai_mapping: template.ai_mapping ?? {},
    is_default: template.is_default ?? false,
  }
  return JSON.parse(JSON.stringify(normalized, (_, value) => (value === undefined ? null : value))) as DocumentTemplateRow
}

function buildAiMappingDraft(bodyMarkdown: string): Record<string, unknown> {
  const variableMatches = [...bodyMarkdown.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1])
  return {
    detected_variables: [...new Set(variableMatches)],
    source: 'heuristic',
    ready_for_review: variableMatches.length > 0,
  }
}

interface DetectedTemplateField {
  field_key: string
  label: string
  role: DocumentTemplateFieldRow['role']
  value_path: string | null
  required: boolean
  source: DocumentTemplateFieldRow['source']
  confidence: number
  notes: string | null
}

interface SourceAnalysis {
  source: 'claude' | 'heuristic'
  summary: string
  warnings: string[]
  fields: DetectedTemplateField[]
}

async function analyzeSourceFields(source: ConventionTemplateSourceInput): Promise<SourceAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey && source.extractedText && source.extractedText.length > 200) {
    try {
      return await callClaudeDocumentAnalyzer(apiKey, source)
    } catch (error) {
      return heuristicSourceAnalysis(source, [`Analyse Claude indisponible, analyse heuristique utilisee: ${error instanceof Error ? error.message : 'erreur inconnue'}`])
    }
  }
  return heuristicSourceAnalysis(source, source.extractedText ? [] : ['Aucun texte extrait: detection fondee sur le type de document et le schema PFMP officiel.'])
}

async function callClaudeDocumentAnalyzer(apiKey: string, source: ConventionTemplateSourceInput): Promise<SourceAnalysis> {
  const model = process.env.CLAUDE_MODEL_DOCUMENTS ?? process.env.CLAUDE_MODEL_VOICE ?? 'claude-sonnet-4-20250514'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      messages: [
        {
          role: 'user',
          content:
            'Tu es un analyste de conventions PFMP de lycee professionnel francais. ' +
            'Analyse ce document source et retourne un JSON strict avec summary, warnings, fields. ' +
            'Chaque field doit avoir field_key, label, role(student,parent,school,company,tutor,period,placement,signature,free), value_path, required, confidence, notes. ' +
            'Priorise les champs obligatoires: eleve, classe, periode, entreprise, SIRET, tuteur, signatures tuteur/parent/etablissement, assurances, horaires. ' +
            `Fichier: ${source.fileName} (${source.mimeType}). Texte extrait:\n` +
            source.extractedText,
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Claude indisponible: ${response.status}`)
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> }
  const text = payload.content?.find((part) => part.type === 'text')?.text ?? ''
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('Reponse Claude non JSON.')
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>
  return normalizeSourceAnalysis(parsed, 'claude', source)
}

function heuristicSourceAnalysis(source: ConventionTemplateSourceInput, warnings: string[] = []): SourceAnalysis {
  const text = `${source.fileName}\n${source.extractedText ?? ''}`.toLowerCase()
  const fields = ESSENTIAL_CONVENTION_FIELDS.map((field) => {
    const confidenceBoost = field.keywords.some((keyword) => text.includes(keyword)) ? 0.12 : 0
    return {
      field_key: field.field_key,
      label: field.label,
      role: field.role,
      value_path: field.value_path,
      required: field.required,
      source: 'heuristic' as const,
      confidence: Math.min(0.96, field.confidence + confidenceBoost),
      notes: field.notes,
    }
  })
  return {
    source: 'heuristic',
    summary: `Analyse initiale ${source.fileName}: modele PFMP prepare avec les champs essentiels a valider.`,
    warnings,
    fields,
  }
}

function normalizeSourceAnalysis(parsed: Record<string, unknown>, sourceType: 'claude' | 'heuristic', source: ConventionTemplateSourceInput): SourceAnalysis {
  const warnings = normalizeStringArray(parsed.warnings, 8)
  const rawFields = Array.isArray(parsed.fields) ? parsed.fields : []
  const fields = rawFields
    .map((item) => normalizeField(asRecord(item), sourceType === 'claude' ? 'ai' : 'heuristic'))
    .filter((item): item is DetectedTemplateField => Boolean(item))
  const merged = mergeFields([...fields, ...heuristicSourceAnalysis(source).fields])
  return {
    source: sourceType,
    summary: clean(parsed.summary).slice(0, 500) || `Analyse ${source.fileName} terminee.`,
    warnings,
    fields: merged,
  }
}

function normalizeField(record: Record<string, unknown>, source: DocumentTemplateFieldRow['source']): DetectedTemplateField | null {
  const fieldKey = clean(record.field_key).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120)
  const label = clean(record.label).slice(0, 180)
  if (!fieldKey || !label) return null
  const role = normalizeFieldRole(record.role)
  const confidence = Number(record.confidence)
  return {
    field_key: fieldKey,
    label,
    role,
    value_path: clean(record.value_path) || fieldKey,
    required: record.required !== false,
    source,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.72,
    notes: clean(record.notes).slice(0, 260) || null,
  }
}

function mergeFields(fields: DetectedTemplateField[]): DetectedTemplateField[] {
  const byKey = new Map<string, DetectedTemplateField>()
  for (const field of fields) {
    const existing = byKey.get(field.field_key)
    if (!existing || field.confidence > existing.confidence || field.source === 'ai') byKey.set(field.field_key, field)
  }
  return [...byKey.values()]
}

function normalizeFieldRole(value: unknown): DocumentTemplateFieldRow['role'] {
  const role = clean(value)
  const allowed: DocumentTemplateFieldRow['role'][] = ['student', 'parent', 'school', 'company', 'tutor', 'period', 'placement', 'signature', 'free']
  return allowed.includes(role as DocumentTemplateFieldRow['role']) ? (role as DocumentTemplateFieldRow['role']) : 'free'
}

async function uploadTemplateSource(
  adminClient: AdminClient,
  establishmentId: string,
  templateId: string,
  source: ConventionTemplateSourceInput,
): Promise<{ path: string | null; warning: string | null }> {
  if (!source.sourceBase64) return { path: null, warning: 'Fichier source non stocke: contenu binaire absent.' }
  try {
    const bytes = Buffer.from(source.sourceBase64, 'base64')
    const safeName = source.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    const path = `${establishmentId}/templates/${templateId}/${safeName}`
    const bucket = process.env.DOCUMENT_TEMPLATE_SOURCE_BUCKET ?? TEMPLATE_SOURCE_BUCKET
    const { error } = await adminClient.storage.from(bucket).upload(path, bytes, {
      contentType: source.mimeType,
      upsert: true,
    })
    if (error) return { path: null, warning: `Source analysee mais non stockee (${bucket}): ${error.message}` }
    return { path, warning: null }
  } catch (error) {
    return { path: null, warning: `Source analysee mais upload impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}` }
  }
}

async function insertTemplateFields(
  adminClient: AdminClient,
  establishmentId: string,
  templateId: string,
  fields: DetectedTemplateField[],
  now: string,
): Promise<DocumentTemplateFieldRow[]> {
  if (fields.length === 0) return []
  const rows = fields.map((field) => ({
    establishment_id: establishmentId,
    template_id: templateId,
    field_key: field.field_key,
    label: field.label,
    role: field.role,
    value_path: field.value_path,
    required: field.required,
    source: field.source,
    confidence: field.confidence,
    review_status: 'pending',
    notes: field.notes,
    created_at: now,
    updated_at: now,
  }))
  const { data, error } = await adminClient.from('document_template_fields').insert(rows).select('*')
  if (error) throw new Error(`Creation champs detectes impossible: ${error.message}`)
  return (data as unknown as DocumentTemplateFieldRow[]) ?? []
}

function buildTemplateDraftFromFields(source: ConventionTemplateSourceInput, fields: DetectedTemplateField[]): string {
  const grouped = groupFieldsByRole(fields)
  const lines = [
    `# ${source.name}`,
    '',
    `Source: ${source.fileName}`,
    '',
    '## Eleve',
    ...renderRoleVariables(grouped.student),
    '',
    '## Classe et periode',
    ...renderRoleVariables([...(grouped.period ?? []), ...(grouped.placement ?? [])]),
    '',
    '## Entreprise',
    ...renderRoleVariables(grouped.company),
    '',
    '## Tuteur entreprise',
    ...renderRoleVariables(grouped.tutor),
    '',
    '## Representants et signatures',
    ...renderRoleVariables([...(grouped.parent ?? []), ...(grouped.school ?? []), ...(grouped.signature ?? [])]),
    '',
    '## Mentions et annexes',
    'Les clauses fixes du document source sont conservees dans la piece originale. Ce brouillon numerique sert au pre-remplissage et a la signature.',
  ]
  return lines.join('\n')
}

function groupFieldsByRole(fields: DetectedTemplateField[]): Record<string, DetectedTemplateField[]> {
  return fields.reduce<Record<string, DetectedTemplateField[]>>((groups, field) => {
    const roleFields = groups[field.role] ?? []
    roleFields.push(field)
    groups[field.role] = roleFields
    return groups
  }, {})
}

function renderRoleVariables(fields: DetectedTemplateField[] | undefined): string[] {
  if (!fields || fields.length === 0) return ['- Champ a completer : {{free.notes}}']
  return fields.map((field) => `- ${field.label} : {{${field.value_path ?? field.field_key}}}`)
}

function inferSourceKind(fileName: string, mimeType: string): DocumentTemplateSourceKind {
  const lower = `${fileName} ${mimeType}`.toLowerCase()
  if (lower.includes('.docx') || lower.includes('word')) return 'docx_import'
  if (lower.includes('scan')) return 'pdf_scan'
  if (lower.includes('.pdf') || lower.includes('pdf')) return 'pdf_flat'
  return 'manual'
}

function normalizeSourceKind(value: unknown, fileName: string, mimeType: string): DocumentTemplateSourceKind {
  const kind = clean(value)
  const allowed: DocumentTemplateSourceKind[] = ['manual', 'docx_import', 'pdf_fillable', 'pdf_flat', 'pdf_scan', 'ai_generated', 'system']
  return allowed.includes(kind as DocumentTemplateSourceKind) ? (kind as DocumentTemplateSourceKind) : inferSourceKind(fileName, mimeType)
}

function inferMimeType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

function normalizeBase64(value: string): string | null {
  if (!value) return null
  const commaIndex = value.indexOf(',')
  const base64 = commaIndex >= 0 ? value.slice(commaIndex + 1) : value
  return base64.replace(/\s/g, '').slice(0, 11_000_000) || null
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => clean(item)).filter(Boolean).slice(0, max)
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}

const ESSENTIAL_CONVENTION_FIELDS: Array<DetectedTemplateField & { keywords: string[] }> = [
  {
    field_key: 'student.full_name',
    label: 'Nom et prenom de l eleve',
    role: 'student',
    value_path: 'student.full_name',
    required: true,
    source: 'system',
    confidence: 0.9,
    notes: 'Toujours requis dans une convention PFMP.',
    keywords: ['eleve', 'apprenant', 'stagiaire', 'nom', 'prenom'],
  },
  {
    field_key: 'class.name',
    label: 'Classe',
    role: 'student',
    value_path: 'class.name',
    required: true,
    source: 'system',
    confidence: 0.86,
    notes: 'Permet de rattacher le bon modele a la formation.',
    keywords: ['classe', 'formation', 'specialite'],
  },
  {
    field_key: 'period.dates',
    label: 'Dates de la PFMP',
    role: 'period',
    value_path: 'period.dates',
    required: true,
    source: 'system',
    confidence: 0.88,
    notes: 'Dates issues de la periode PFMP affectee a la classe.',
    keywords: ['date', 'periode', 'pfmp', 'stage'],
  },
  {
    field_key: 'company.name',
    label: 'Raison sociale de l entreprise',
    role: 'company',
    value_path: 'company.name',
    required: true,
    source: 'system',
    confidence: 0.9,
    notes: 'Renseigne par DDFPT, eleve ou lien magique entreprise.',
    keywords: ['entreprise', 'organisme', 'etablissement d accueil', 'raison sociale'],
  },
  {
    field_key: 'company.siret',
    label: 'SIRET',
    role: 'company',
    value_path: 'company.siret',
    required: true,
    source: 'system',
    confidence: 0.84,
    notes: 'Validation format 14 chiffres cote UI.',
    keywords: ['siret', 'siren'],
  },
  {
    field_key: 'company.full_address',
    label: 'Adresse complete de l entreprise',
    role: 'company',
    value_path: 'company.full_address',
    required: true,
    source: 'system',
    confidence: 0.82,
    notes: 'Adresse, code postal et ville.',
    keywords: ['adresse', 'code postal', 'ville'],
  },
  {
    field_key: 'tutor.full_name',
    label: 'Nom et prenom du tuteur entreprise',
    role: 'tutor',
    value_path: 'tutor.full_name',
    required: true,
    source: 'system',
    confidence: 0.88,
    notes: 'Signataire entreprise de la convention.',
    keywords: ['tuteur', 'maitre de stage', 'responsable'],
  },
  {
    field_key: 'tutor.email',
    label: 'Email du tuteur',
    role: 'tutor',
    value_path: 'tutor.email',
    required: true,
    source: 'system',
    confidence: 0.8,
    notes: 'Necessaire pour le lien magique de signature.',
    keywords: ['mail', 'email', 'courriel'],
  },
  {
    field_key: 'parent.full_name',
    label: 'Representant legal si eleve mineur',
    role: 'parent',
    value_path: 'parent.full_name',
    required: false,
    source: 'system',
    confidence: 0.72,
    notes: 'Active si l eleve est mineur.',
    keywords: ['representant legal', 'parent', 'responsable legal', 'mineur'],
  },
  {
    field_key: 'signature.tutor',
    label: 'Signature du tuteur entreprise',
    role: 'signature',
    value_path: 'signature.tutor',
    required: true,
    source: 'system',
    confidence: 0.9,
    notes: 'Signature electronique simple ou papier scanne.',
    keywords: ['signature', 'cachet', 'tuteur'],
  },
  {
    field_key: 'signature.school',
    label: 'Signature et cachet de l etablissement',
    role: 'signature',
    value_path: 'signature.school',
    required: true,
    source: 'system',
    confidence: 0.9,
    notes: 'DDFPT/admin ou chef d etablissement selon workflow local.',
    keywords: ['chef d etablissement', 'dDFPT', 'proviseur', 'cachet'],
  },
]

const DEFAULT_CONVENTION_VARIABLES = {
  student: ['first_name', 'last_name', 'class_name', 'formation'],
  period: ['name', 'start_date', 'end_date'],
  company: ['name', 'address', 'zip_code', 'city', 'siret'],
  tutor: ['first_name', 'last_name', 'function', 'email', 'phone'],
  signatures: ['parent_if_minor', 'tutor', 'school'],
}

const DEFAULT_CONVENTION_TEMPLATE = `# Convention PFMP

## Eleve

Nom et prenom : {{student.first_name}} {{student.last_name}}

Classe : {{class.name}}

Formation : {{student.formation}}

## Periode

PFMP : {{period.name}}

Dates : du {{period.start_date}} au {{period.end_date}}

## Entreprise d'accueil

Raison sociale : {{company.name}}

Adresse : {{company.address}} {{company.zip_code}} {{company.city}}

SIRET : {{company.siret}}

## Tuteur entreprise

Nom et prenom : {{tutor.first_name}} {{tutor.last_name}}

Fonction : {{tutor.function}}

Email / telephone : {{tutor.email}} {{tutor.phone}}

## Signatures

Representant legal si eleve mineur : {{parent.signature}}

Tuteur entreprise : {{tutor.signature}}

Etablissement : {{school.signature}}
`
