import { createServerFn } from '@tanstack/react-start'
import type {
  ClassDocumentTemplateAssignmentRow,
  ClassRow,
  CompanyRow,
  DocumentRow,
  DocumentTemplateRow,
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
  return JSON.parse(JSON.stringify(template, (_, value) => (value === undefined ? null : value))) as DocumentTemplateRow
}

function buildAiMappingDraft(bodyMarkdown: string): Record<string, unknown> {
  const variableMatches = [...bodyMarkdown.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1])
  return {
    detected_variables: [...new Set(variableMatches)],
    source: 'heuristic',
    ready_for_review: variableMatches.length > 0,
  }
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}

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
