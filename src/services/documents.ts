import { getSupabase } from '@/lib/supabase'
import { getActiveEstablishmentScope } from '@/lib/auth'
import type {
  CompanyRow,
  DocumentRow,
  DocumentStatusEnum,
  PfmpPeriodRow,
  StudentRow,
} from '@/lib/database.types'

export interface DocumentFilters {
  type?: string
}

export interface DocumentListItem {
  document: DocumentRow
  student: StudentRow | null
  period: PfmpPeriodRow | null
  company: CompanyRow | null
}

export interface DocumentSummary {
  total: number
  missing: number
  draft: number
  validated: number
  archived: number
}

export async function fetchDocumentPeriods(): Promise<PfmpPeriodRow[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('pfmp_periods')
    .select('*')
    .is('archived_at', null)
    .order('start_date', { ascending: false })

  if (scope) query = query.eq('establishment_id', scope)

  const { data, error } = await query
  if (error) throw new Error(`fetchDocumentPeriods: ${error.message}`)
  return (data as PfmpPeriodRow[]) ?? []
}

export async function fetchDocuments(filters: DocumentFilters = {}): Promise<DocumentListItem[]> {
  const sb = getSupabase()
  const scope = await getActiveEstablishmentScope()
  let query = sb
    .from('documents')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (scope) query = query.eq('establishment_id', scope)
  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw new Error(`fetchDocuments documents: ${error.message}`)

  const documents = (data as DocumentRow[]) ?? []
  if (documents.length === 0) return []

  const [studentsResult, periodsResult, companiesResult] = await Promise.all([
    fetchByIds<StudentRow>('students', unique(documents.map((document) => document.student_id))),
    fetchByIds<PfmpPeriodRow>('pfmp_periods', unique(documents.map((document) => document.period_id))),
    fetchByIds<CompanyRow>('companies', unique(documents.map((document) => document.company_id))),
  ])

  const studentById = indexById(studentsResult)
  const periodById = indexById(periodsResult)
  const companyById = indexById(companiesResult)

  return documents.map((document) => ({
    document,
    student: document.student_id ? studentById.get(document.student_id) ?? null : null,
    period: document.period_id ? periodById.get(document.period_id) ?? null : null,
    company: document.company_id ? companyById.get(document.company_id) ?? null : null,
  }))
}

export function buildDocumentSummary(items: DocumentListItem[]): DocumentSummary {
  const summary: DocumentSummary = {
    total: items.length,
    missing: 0,
    draft: 0,
    validated: 0,
    archived: 0,
  }
  for (const item of items) {
    summary[item.document.status as DocumentStatusEnum] += 1
  }
  return summary
}

async function fetchByIds<T>(table: string, ids: string[]): Promise<T[]> {
  if (ids.length === 0) return []
  const sb = getSupabase()
  const { data, error } = await sb.from(table).select('*').in('id', ids)
  if (error) throw new Error(`fetchDocuments ${table}: ${error.message}`)
  return (data as T[]) ?? []
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}
