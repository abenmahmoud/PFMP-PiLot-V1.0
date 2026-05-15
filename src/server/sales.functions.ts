import { createServerFn } from '@tanstack/react-start'
import type { SalesLeadOrganizationType, SalesLeadRow } from '@/lib/database.types'
import { clean, createAdminClient, safeHandlerCall } from './_lib'

export interface SalesLeadInput {
  contactName: string
  email: string
  phone: string | null
  organizationName: string
  roleLabel: string | null
  organizationType: SalesLeadOrganizationType
  city: string | null
  establishmentsCount: number | null
  studentsCount: number | null
  message: string | null
  needsDemo: boolean
  website?: string | null
}

export interface SalesLeadSubmitResult {
  ok: true
  leadId: string
}

const ORGANIZATION_TYPES: SalesLeadOrganizationType[] = [
  'lycee',
  'groupe_scolaire',
  'rectorat',
  'collectivite',
  'autre',
]

export const submitSalesLead = createServerFn({ method: 'POST' })
  .inputValidator(validateSalesLeadInput)
  .handler(async ({ data }): Promise<SalesLeadSubmitResult> => {
    return safeHandlerCall(async () => {
      // Honeypot anti-spam: les vrais utilisateurs ne voient pas ce champ.
      if (data.website && data.website.trim().length > 0) {
        return { ok: true, leadId: 'ignored-spam-lead' }
      }

      const adminClient = createAdminClient()
      const { data: inserted, error } = await adminClient
        .from('sales_leads')
        .insert({
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          organization_name: data.organizationName,
          role_label: data.roleLabel,
          organization_type: data.organizationType,
          city: data.city,
          establishments_count: data.establishmentsCount,
          students_count: data.studentsCount,
          message: data.message,
          needs_demo: data.needsDemo,
          status: 'new',
          source: 'public_devis',
        })
        .select('*')
        .single()

      if (error) throw new Error(`Demande commerciale impossible: ${error.message}`)
      return { ok: true, leadId: (inserted as SalesLeadRow).id }
    })
  })

function validateSalesLeadInput(input: unknown): SalesLeadInput {
  const record = asRecord(input)
  const contactName = requiredText(record.contactName, 'Nom', 120)
  const email = requiredEmail(record.email)
  const organizationName = requiredText(record.organizationName, 'Etablissement', 160)
  const organizationType = parseOrganizationType(record.organizationType)

  return {
    contactName,
    email,
    phone: optionalText(record.phone, 40),
    organizationName,
    roleLabel: optionalText(record.roleLabel, 120),
    organizationType,
    city: optionalText(record.city, 120),
    establishmentsCount: optionalInteger(record.establishmentsCount, 0, 5000),
    studentsCount: optionalInteger(record.studentsCount, 0, 500000),
    message: optionalText(record.message, 2000),
    needsDemo: typeof record.needsDemo === 'boolean' ? record.needsDemo : true,
    website: optionalText(record.website, 300),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  const text = clean(value).replace(/\s+/g, ' ')
  if (!text) throw new Error(`${label} obligatoire.`)
  if (text.length > maxLength) throw new Error(`${label} trop long.`)
  return text
}

function optionalText(value: unknown, maxLength: number): string | null {
  const text = clean(value).replace(/\s+/g, ' ')
  if (!text) return null
  return text.slice(0, maxLength)
}

function requiredEmail(value: unknown): string {
  const email = clean(value).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide.')
  return email.slice(0, 180)
}

function optionalInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed)) return null
  return Math.max(min, Math.min(max, parsed))
}

function parseOrganizationType(value: unknown): SalesLeadOrganizationType {
  const type = clean(value) as SalesLeadOrganizationType
  return ORGANIZATION_TYPES.includes(type) ? type : 'lycee'
}
