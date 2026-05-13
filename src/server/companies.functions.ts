import { createServerFn } from '@tanstack/react-start'
import type { CompanyRow, ProfileRow, TutorRow, UserRole } from '@/lib/database.types'
import type { CompanyReliability, CompanyStatus, ProfessionalFamily, TutorResponsiveness } from '@/types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  insertAuditLog,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

export interface CompanyCreateInput {
  establishmentId?: string | null
  name: string
  address: string | null
  city: string | null
  zipCode: string | null
  phone: string | null
  email: string | null
  website: string | null
  siret: string | null
  sector: string | null
  professionalFamily: ProfessionalFamily | null
  compatibleFormations: string[]
  reliability: CompanyReliability
  status: CompanyStatus
  internalNotes: string | null
}

export type CompanyUpdateInput = Partial<Omit<CompanyCreateInput, 'establishmentId'>>

export interface TutorCreateInput {
  firstName: string
  lastName: string
  function: string | null
  email: string | null
  phone: string | null
  responsiveness: TutorResponsiveness | null
  internalNotes: string | null
}

export type TutorUpdateInput = Partial<TutorCreateInput>

export interface CompanyImportRow {
  name: string
  siret?: string | null
  address?: string | null
  zipCode?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  sector?: string | null
  professionalFamily?: ProfessionalFamily | null
}

export interface CompanyWithTutors {
  company: CompanyRow
  tutors: TutorRow[]
}

export interface ImportCompaniesResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  dryRun: boolean
}

interface AccessInput {
  accessToken: string
  establishmentId?: string | null
}

interface CompanyMutationInput extends AccessInput {
  companyId: string
}

interface TutorMutationInput extends AccessInput {
  tutorId: string
}

const MANAGE_ROLES: UserRole[] = ['admin', 'ddfpt', 'superadmin']
const READ_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'referent', 'superadmin']
const COMPANY_STATUSES: CompanyStatus[] = ['active', 'strong_partner', 'to_recontact', 'to_watch', 'to_avoid']
const COMPANY_RELIABILITIES: CompanyReliability[] = ['high', 'medium', 'low', 'unknown']
const PROFESSIONAL_FAMILIES: ProfessionalFamily[] = [
  'automobile',
  'commerce_vente',
  'gestion_administration',
  'artisanat_art',
  'hotellerie_restauration',
  'sante_social',
  'numerique',
  'industrie',
  'btp',
  'transport_logistique',
  'service_public',
  'autre',
]
const RESPONSIVENESSES: TutorResponsiveness[] = ['fast', 'medium', 'slow', 'unknown']

export const listCompaniesForEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateListCompaniesInput)
  .handler(async ({ data }): Promise<CompanyWithTutors[]> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanReadCompanies(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      let companiesQuery = adminClient
        .from('companies')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('name')

      if (!data.includeArchived) companiesQuery = companiesQuery.is('archived_at', null)

      const { data: companies, error } = await companiesQuery
      if (error) throw new Error(`Lecture entreprises impossible: ${error.message}`)

      const rows = (companies as unknown as CompanyRow[]) ?? []
      if (rows.length === 0) return []

      const { data: tutors, error: tutorError } = await adminClient
        .from('tutors')
        .select('*')
        .eq('establishment_id', establishmentId)
        .in('company_id', rows.map((company) => company.id))
        .order('last_name')
        .order('first_name')
      if (tutorError) throw new Error(`Lecture tuteurs impossible: ${tutorError.message}`)

      const byCompany = groupBy((tutors as unknown as TutorRow[]) ?? [], (tutor) => tutor.company_id)
      return rows.map((company) => ({ company, tutors: byCompany.get(company.id) ?? [] }))
    })
  })

export const createCompany = createServerFn({ method: 'POST' })
  .inputValidator(validateCreateCompanyInput)
  .handler(async ({ data }): Promise<CompanyRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const establishmentId = resolveEstablishmentId(caller, data.data.establishmentId)

      const inserted = await insertCompany(adminClient, establishmentId, data.data)
      await insertAuditLog(adminClient, {
        establishmentId,
        userId: caller.id,
        action: 'company.created',
        description: `Entreprise creee: ${inserted.name}`,
        metadata: { company_id: inserted.id, siret: inserted.siret, source: 'server.companies' },
      })
      return inserted
    })
  })

export const updateCompany = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateCompanyInput)
  .handler(async ({ data }): Promise<CompanyRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const company = await getCompanyById(adminClient, data.companyId)
      assertSameTenant(caller, company.establishment_id, data.establishmentId)

      const updated = await updateCompanyRow(adminClient, company.id, data.data)
      await insertAuditLog(adminClient, {
        establishmentId: company.establishment_id,
        userId: caller.id,
        action: 'company.updated',
        description: `Entreprise modifiee: ${updated.name}`,
        metadata: { company_id: company.id, source: 'server.companies' },
      })
      return updated
    })
  })

export const archiveCompany = createServerFn({ method: 'POST' })
  .inputValidator(validateCompanyMutationInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const company = await getCompanyById(adminClient, data.companyId)
      assertSameTenant(caller, company.establishment_id, data.establishmentId)

      const archivedAt = new Date().toISOString()
      const { error } = await adminClient.from('companies').update({ archived_at: archivedAt }).eq('id', company.id)
      if (error) throw new Error(`Archivage entreprise impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: company.establishment_id,
        userId: caller.id,
        action: 'company.archived',
        description: `Entreprise archivee: ${company.name}`,
        metadata: { company_id: company.id, source: 'server.companies' },
      })
      return { ok: true, archivedAt }
    })
  })

export const restoreCompany = createServerFn({ method: 'POST' })
  .inputValidator(validateCompanyMutationInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const company = await getCompanyById(adminClient, data.companyId)
      assertSameTenant(caller, company.establishment_id, data.establishmentId)

      const { error } = await adminClient.from('companies').update({ archived_at: null }).eq('id', company.id)
      if (error) throw new Error(`Restauration entreprise impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: company.establishment_id,
        userId: caller.id,
        action: 'company.restored',
        description: `Entreprise restauree: ${company.name}`,
        metadata: { company_id: company.id, source: 'server.companies' },
      })
      return { ok: true }
    })
  })

export const createTutor = createServerFn({ method: 'POST' })
  .inputValidator(validateCreateTutorInput)
  .handler(async ({ data }): Promise<TutorRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const company = await getCompanyById(adminClient, data.companyId)
      assertSameTenant(caller, company.establishment_id, data.establishmentId)

      const tutor = await insertTutor(adminClient, company, data.data)
      await insertAuditLog(adminClient, {
        establishmentId: company.establishment_id,
        userId: caller.id,
        action: 'company.tutor.created',
        description: `Tuteur cree: ${tutor.first_name} ${tutor.last_name}`,
        metadata: { company_id: company.id, tutor_id: tutor.id, source: 'server.companies' },
      })
      return tutor
    })
  })

export const updateTutor = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateTutorInput)
  .handler(async ({ data }): Promise<TutorRow> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const tutor = await getTutorById(adminClient, data.tutorId)
      assertSameTenant(caller, tutor.establishment_id, data.establishmentId)

      const updated = await updateTutorRow(adminClient, tutor.id, data.data)
      await insertAuditLog(adminClient, {
        establishmentId: tutor.establishment_id,
        userId: caller.id,
        action: 'company.tutor.updated',
        description: `Tuteur modifie: ${updated.first_name} ${updated.last_name}`,
        metadata: { company_id: tutor.company_id, tutor_id: tutor.id, source: 'server.companies' },
      })
      return updated
    })
  })

export const archiveTutor = createServerFn({ method: 'POST' })
  .inputValidator(validateTutorMutationInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const tutor = await getTutorById(adminClient, data.tutorId)
      assertSameTenant(caller, tutor.establishment_id, data.establishmentId)

      const archivedAt = new Date().toISOString()
      const { error } = await adminClient.from('tutors').update({ archived_at: archivedAt }).eq('id', tutor.id)
      if (error) throw new Error(`Archivage tuteur impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: tutor.establishment_id,
        userId: caller.id,
        action: 'company.tutor.archived',
        description: `Tuteur archive: ${tutor.first_name} ${tutor.last_name}`,
        metadata: { company_id: tutor.company_id, tutor_id: tutor.id, source: 'server.companies' },
      })
      return { ok: true, archivedAt }
    })
  })

export const restoreTutor = createServerFn({ method: 'POST' })
  .inputValidator(validateTutorMutationInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const tutor = await getTutorById(adminClient, data.tutorId)
      assertSameTenant(caller, tutor.establishment_id, data.establishmentId)

      const { error } = await adminClient.from('tutors').update({ archived_at: null }).eq('id', tutor.id)
      if (error) throw new Error(`Restauration tuteur impossible: ${error.message}`)

      await insertAuditLog(adminClient, {
        establishmentId: tutor.establishment_id,
        userId: caller.id,
        action: 'company.tutor.restored',
        description: `Tuteur restaure: ${tutor.first_name} ${tutor.last_name}`,
        metadata: { company_id: tutor.company_id, tutor_id: tutor.id, source: 'server.companies' },
      })
      return { ok: true }
    })
  })

export const importCompanies = createServerFn({ method: 'POST' })
  .inputValidator(validateImportCompaniesInput)
  .handler(async ({ data }): Promise<ImportCompaniesResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanManageCompanies(caller)
      const establishmentId = resolveEstablishmentId(caller, data.establishmentId)

      let created = 0
      let updated = 0
      let skipped = 0
      const errors: string[] = []

      for (const [index, row] of data.rows.entries()) {
        try {
          const existing = await findExistingCompanyForImport(adminClient, establishmentId, row)
          if (existing) {
            if (!data.dryRun) await updateCompanyRow(adminClient, existing.id, importRowToUpdate(row))
            updated += 1
          } else {
            if (!data.dryRun) await insertCompany(adminClient, establishmentId, importRowToCreate(row))
            created += 1
          }
        } catch (error) {
          skipped += 1
          errors.push(`Ligne ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (!data.dryRun) {
        await insertAuditLog(adminClient, {
          establishmentId,
          userId: caller.id,
          action: 'company.bulk_imported',
          description: `Import entreprises: ${created} creees, ${updated} mises a jour`,
          metadata: { created, updated, skipped, errors_count: errors.length, source: 'server.companies' },
        })
      }
      return { created, updated, skipped, errors, dryRun: data.dryRun }
    })
  })

function validateListCompaniesInput(data: unknown): AccessInput & { includeArchived: boolean } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    includeArchived: Boolean(record.includeArchived),
  }
}

function validateCreateCompanyInput(data: unknown): { accessToken: string; data: CompanyCreateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    data: validateCompanyCreateData(asRecord(record.data)),
  }
}

function validateUpdateCompanyInput(data: unknown): CompanyMutationInput & { data: CompanyUpdateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    companyId: validateUuid(record.companyId, 'Entreprise'),
    data: validateCompanyUpdateData(asRecord(record.data)),
  }
}

function validateCompanyMutationInput(data: unknown): CompanyMutationInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    companyId: validateUuid(record.companyId, 'Entreprise'),
  }
}

function validateCreateTutorInput(data: unknown): CompanyMutationInput & { data: TutorCreateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    companyId: validateUuid(record.companyId, 'Entreprise'),
    data: validateTutorCreateData(asRecord(record.data)),
  }
}

function validateUpdateTutorInput(data: unknown): TutorMutationInput & { data: TutorUpdateInput } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    tutorId: validateUuid(record.tutorId, 'Tuteur'),
    data: validateTutorUpdateData(asRecord(record.data)),
  }
}

function validateTutorMutationInput(data: unknown): TutorMutationInput {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    tutorId: validateUuid(record.tutorId, 'Tuteur'),
  }
}

function validateImportCompaniesInput(data: unknown): AccessInput & { rows: CompanyImportRow[]; dryRun: boolean } {
  const record = asRecord(data)
  const rows = Array.isArray(record.rows) ? record.rows : []
  if (rows.length === 0) throw new Error('Aucune ligne entreprise a importer.')
  if (rows.length > 200) throw new Error('Import limite a 200 lignes par appel.')
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    rows: rows.map((row) => validateImportRow(asRecord(row))),
    dryRun: Boolean(record.dryRun),
  }
}

function validateCompanyCreateData(record: Record<string, unknown>): CompanyCreateInput {
  const name = requiredString(record.name, 'Nom entreprise')
  return {
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
    name,
    address: optionalText(record.address),
    city: optionalText(record.city),
    zipCode: optionalText(record.zipCode),
    phone: optionalText(record.phone),
    email: optionalEmail(record.email),
    website: optionalText(record.website),
    siret: optionalSiret(record.siret),
    sector: optionalText(record.sector),
    professionalFamily: optionalEnum(record.professionalFamily, PROFESSIONAL_FAMILIES, 'Famille metier'),
    compatibleFormations: stringArray(record.compatibleFormations),
    reliability: optionalEnum(record.reliability, COMPANY_RELIABILITIES, 'Fiabilite') ?? 'unknown',
    status: optionalEnum(record.status, COMPANY_STATUSES, 'Statut') ?? 'active',
    internalNotes: optionalText(record.internalNotes),
  }
}

function validateCompanyUpdateData(record: Record<string, unknown>): CompanyUpdateInput {
  return {
    name: record.name === undefined ? undefined : requiredString(record.name, 'Nom entreprise'),
    address: record.address === undefined ? undefined : optionalText(record.address),
    city: record.city === undefined ? undefined : optionalText(record.city),
    zipCode: record.zipCode === undefined ? undefined : optionalText(record.zipCode),
    phone: record.phone === undefined ? undefined : optionalText(record.phone),
    email: record.email === undefined ? undefined : optionalEmail(record.email),
    website: record.website === undefined ? undefined : optionalText(record.website),
    siret: record.siret === undefined ? undefined : optionalSiret(record.siret),
    sector: record.sector === undefined ? undefined : optionalText(record.sector),
    professionalFamily:
      record.professionalFamily === undefined
        ? undefined
        : optionalEnum(record.professionalFamily, PROFESSIONAL_FAMILIES, 'Famille metier'),
    compatibleFormations:
      record.compatibleFormations === undefined ? undefined : stringArray(record.compatibleFormations),
    reliability:
      record.reliability === undefined ? undefined : optionalEnum(record.reliability, COMPANY_RELIABILITIES, 'Fiabilite') ?? 'unknown',
    status: record.status === undefined ? undefined : optionalEnum(record.status, COMPANY_STATUSES, 'Statut') ?? 'active',
    internalNotes: record.internalNotes === undefined ? undefined : optionalText(record.internalNotes),
  }
}

function validateTutorCreateData(record: Record<string, unknown>): TutorCreateInput {
  return {
    firstName: requiredString(record.firstName, 'Prenom tuteur'),
    lastName: requiredString(record.lastName, 'Nom tuteur'),
    function: optionalText(record.function),
    email: optionalEmail(record.email),
    phone: optionalText(record.phone),
    responsiveness: optionalEnum(record.responsiveness, RESPONSIVENESSES, 'Reactivite'),
    internalNotes: optionalText(record.internalNotes),
  }
}

function validateTutorUpdateData(record: Record<string, unknown>): TutorUpdateInput {
  return {
    firstName: record.firstName === undefined ? undefined : requiredString(record.firstName, 'Prenom tuteur'),
    lastName: record.lastName === undefined ? undefined : requiredString(record.lastName, 'Nom tuteur'),
    function: record.function === undefined ? undefined : optionalText(record.function),
    email: record.email === undefined ? undefined : optionalEmail(record.email),
    phone: record.phone === undefined ? undefined : optionalText(record.phone),
    responsiveness:
      record.responsiveness === undefined ? undefined : optionalEnum(record.responsiveness, RESPONSIVENESSES, 'Reactivite'),
    internalNotes: record.internalNotes === undefined ? undefined : optionalText(record.internalNotes),
  }
}

function validateImportRow(record: Record<string, unknown>): CompanyImportRow {
  return {
    name: requiredString(record.name, 'Nom entreprise'),
    siret: optionalSiret(record.siret),
    address: optionalText(record.address),
    zipCode: optionalText(record.zipCode),
    city: optionalText(record.city),
    phone: optionalText(record.phone),
    email: optionalEmail(record.email),
    website: optionalText(record.website),
    sector: optionalText(record.sector),
    professionalFamily: optionalEnum(record.professionalFamily, PROFESSIONAL_FAMILIES, 'Famille metier'),
  }
}

function assertCanReadCompanies(caller: ProfileRow): void {
  if (!READ_ROLES.includes(caller.role)) throw new Error('Acces refuse: lecture entreprises non autorisee.')
}

function assertCanManageCompanies(caller: ProfileRow): void {
  if (!MANAGE_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: seuls admin, DDFPT et superadmin peuvent modifier les entreprises.')
  }
}

function resolveEstablishmentId(caller: ProfileRow, requested?: string | null): string {
  if (caller.role === 'superadmin') {
    const establishmentId = requested ? validateUuid(requested, 'Etablissement') : null
    if (!establishmentId) throw new Error('Selectionnez un etablissement avant cette action superadmin.')
    return establishmentId
  }
  if (!caller.establishment_id) throw new Error('Profil sans etablissement rattache.')
  if (requested && requested !== caller.establishment_id) throw new Error('Acces refuse: etablissement non autorise.')
  return caller.establishment_id
}

function assertSameTenant(caller: ProfileRow, targetEstablishmentId: string, requested?: string | null): void {
  const allowedEstablishmentId = resolveEstablishmentId(caller, requested)
  if (allowedEstablishmentId !== targetEstablishmentId) throw new Error('Acces refuse: ressource hors tenant.')
}

async function insertCompany(
  adminClient: AdminClient,
  establishmentId: string,
  input: CompanyCreateInput,
): Promise<CompanyRow> {
  const siret = input.siret
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      establishment_id: establishmentId,
      name: input.name,
      address: input.address,
      city: input.city,
      zip_code: input.zipCode,
      phone: input.phone,
      email: input.email,
      website: input.website,
      siret,
      siren: siret ? siret.slice(0, 9) : null,
      sector: input.sector,
      professional_family: input.professionalFamily,
      compatible_formations: input.compatibleFormations,
      reliability: input.reliability,
      status: input.status,
      internal_notes: input.internalNotes,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation entreprise impossible: ${error.message}`)
  return data as unknown as CompanyRow
}

async function updateCompanyRow(
  adminClient: AdminClient,
  companyId: string,
  input: CompanyUpdateInput,
): Promise<CompanyRow> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.address !== undefined) patch.address = input.address
  if (input.city !== undefined) patch.city = input.city
  if (input.zipCode !== undefined) patch.zip_code = input.zipCode
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.email !== undefined) patch.email = input.email
  if (input.website !== undefined) patch.website = input.website
  if (input.siret !== undefined) {
    patch.siret = input.siret
    patch.siren = input.siret ? input.siret.slice(0, 9) : null
  }
  if (input.sector !== undefined) patch.sector = input.sector
  if (input.professionalFamily !== undefined) patch.professional_family = input.professionalFamily
  if (input.compatibleFormations !== undefined) patch.compatible_formations = input.compatibleFormations
  if (input.reliability !== undefined) patch.reliability = input.reliability
  if (input.status !== undefined) patch.status = input.status
  if (input.internalNotes !== undefined) patch.internal_notes = input.internalNotes
  patch.updated_at = new Date().toISOString()

  const { data, error } = await adminClient.from('companies').update(patch).eq('id', companyId).select('*').single()
  if (error) throw new Error(`Mise a jour entreprise impossible: ${error.message}`)
  return data as unknown as CompanyRow
}

async function insertTutor(
  adminClient: AdminClient,
  company: CompanyRow,
  input: TutorCreateInput,
): Promise<TutorRow> {
  const { data, error } = await adminClient
    .from('tutors')
    .insert({
      establishment_id: company.establishment_id,
      company_id: company.id,
      first_name: input.firstName,
      last_name: input.lastName,
      function: input.function,
      email: input.email,
      phone: input.phone,
      responsiveness: input.responsiveness ?? 'unknown',
      internal_notes: input.internalNotes,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Creation tuteur impossible: ${error.message}`)
  return data as unknown as TutorRow
}

async function updateTutorRow(adminClient: AdminClient, tutorId: string, input: TutorUpdateInput): Promise<TutorRow> {
  const patch: Record<string, unknown> = {}
  if (input.firstName !== undefined) patch.first_name = input.firstName
  if (input.lastName !== undefined) patch.last_name = input.lastName
  if (input.function !== undefined) patch.function = input.function
  if (input.email !== undefined) patch.email = input.email
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.responsiveness !== undefined) patch.responsiveness = input.responsiveness ?? 'unknown'
  if (input.internalNotes !== undefined) patch.internal_notes = input.internalNotes
  patch.updated_at = new Date().toISOString()

  const { data, error } = await adminClient.from('tutors').update(patch).eq('id', tutorId).select('*').single()
  if (error) throw new Error(`Mise a jour tuteur impossible: ${error.message}`)
  return data as unknown as TutorRow
}

async function getCompanyById(adminClient: AdminClient, companyId: string): Promise<CompanyRow> {
  const { data, error } = await adminClient.from('companies').select('*').eq('id', companyId).maybeSingle()
  if (error) throw new Error(`Lecture entreprise impossible: ${error.message}`)
  if (!data) throw new Error('Entreprise introuvable.')
  return data as unknown as CompanyRow
}

async function getTutorById(adminClient: AdminClient, tutorId: string): Promise<TutorRow> {
  const { data, error } = await adminClient.from('tutors').select('*').eq('id', tutorId).maybeSingle()
  if (error) throw new Error(`Lecture tuteur impossible: ${error.message}`)
  if (!data) throw new Error('Tuteur introuvable.')
  return data as unknown as TutorRow
}

async function findExistingCompanyForImport(
  adminClient: AdminClient,
  establishmentId: string,
  row: CompanyImportRow,
): Promise<CompanyRow | null> {
  const siret = optionalSiret(row.siret)
  if (siret) {
    const { data, error } = await adminClient
      .from('companies')
      .select('*')
      .eq('establishment_id', establishmentId)
      .eq('siret', siret)
      .maybeSingle()
    if (error) throw new Error(`Recherche SIRET impossible: ${error.message}`)
    return (data as unknown as CompanyRow | null) ?? null
  }

  const { data, error } = await adminClient
    .from('companies')
    .select('*')
    .eq('establishment_id', establishmentId)
    .ilike('name', row.name)
    .ilike('city', row.city ?? '')
    .maybeSingle()
  if (error) throw new Error(`Recherche doublon impossible: ${error.message}`)
  return (data as unknown as CompanyRow | null) ?? null
}

function importRowToCreate(row: CompanyImportRow): CompanyCreateInput {
  return {
    name: row.name,
    address: row.address ?? null,
    city: row.city ?? null,
    zipCode: row.zipCode ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    siret: row.siret ?? null,
    sector: row.sector ?? null,
    professionalFamily: row.professionalFamily ?? null,
    compatibleFormations: [],
    reliability: 'unknown',
    status: 'active',
    internalNotes: null,
  }
}

function importRowToUpdate(row: CompanyImportRow): CompanyUpdateInput {
  return {
    name: row.name,
    address: row.address ?? null,
    city: row.city ?? null,
    zipCode: row.zipCode ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    siret: row.siret ?? null,
    sector: row.sector ?? null,
    professionalFamily: row.professionalFamily ?? null,
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Payload invalide.')
  return data as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  const text = clean(value)
  if (!text) throw new Error(`${label} requis.`)
  return text
}

function optionalText(value: unknown): string | null {
  const text = clean(value)
  return text || null
}

function optionalEmail(value: unknown): string | null {
  const email = clean(value).toLowerCase()
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide.')
  return email
}

function optionalSiret(value: unknown): string | null {
  const siret = clean(value).replace(/\s/g, '')
  if (!siret) return null
  if (!/^\d{14}$/.test(siret)) throw new Error('SIRET invalide: 14 chiffres attendus.')
  return siret
}

function optionalUuid(value: unknown, label: string): string | null {
  const uuid = clean(value)
  return uuid ? validateUuid(uuid, label) : null
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | null {
  const text = clean(value)
  if (!text) return null
  if (!allowed.includes(text as T)) throw new Error(`${label} invalide.`)
  return text as T
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => clean(item)).filter(Boolean).slice(0, 40)
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const value = key(row)
    const list = map.get(value) ?? []
    list.push(row)
    map.set(value, list)
  }
  return map
}
