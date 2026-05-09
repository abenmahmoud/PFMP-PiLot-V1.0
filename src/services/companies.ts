import { getSupabase } from '@/lib/supabase'
import type {
  CompanyRow,
  PfmpPeriodRow,
  PlacementRow,
  StudentRow,
  TutorRow,
} from '@/lib/database.types'
import type { CompanyReliability, CompanyStatus, ProfessionalFamily } from '@/types'

export interface CompanyFilters {
  city?: string
  professionalFamily?: ProfessionalFamily
  reliability?: CompanyReliability
  status?: CompanyStatus
  search?: string
}

export interface CompanyListItem {
  company: CompanyRow
  tutors: TutorRow[]
}

export interface CompanyPlacementHistoryItem {
  placement: PlacementRow
  student: StudentRow | null
  period: PfmpPeriodRow | null
  tutor: TutorRow | null
}

export interface CompanyDetail {
  company: CompanyRow
  tutors: TutorRow[]
  placements: CompanyPlacementHistoryItem[]
  stats: {
    placementsCount: number
    studentsHosted: number
    activePlacements: number
    latestHostedAt: string | null
  }
}

export interface CompanyNetworkSummary {
  totalCompanies: number
  activeCompanies: number
  strongPartners: number
  toRecontact: number
  toWatch: number
  toAvoid: number
  tutorsCount: number
  tutorsWithEmail: number
  averageCompletionRate: number
}

export async function fetchCompanies(filters: CompanyFilters = {}): Promise<CompanyListItem[]> {
  const sb = getSupabase()
  let query = sb
    .from('companies')
    .select('*')
    .is('archived_at', null)
    .order('name')

  if (filters.city) query = query.ilike('city', `%${filters.city}%`)
  if (filters.professionalFamily) query = query.eq('professional_family', filters.professionalFamily)
  if (filters.reliability) query = query.eq('reliability', filters.reliability)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(`fetchCompanies companies: ${error.message}`)

  let companies = ((data as CompanyRow[]) ?? []).filter((company) => {
    const normalized = filters.search?.trim().toLowerCase()
    if (!normalized) return true
    return [
      company.name,
      company.city,
      company.zip_code,
      company.sector,
      company.professional_family,
      company.siret,
      company.siren,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized))
  })

  if (companies.length === 0) return []

  const companyIds = companies.map((company) => company.id)
  const { data: tutorsData, error: tutorsError } = await sb
    .from('tutors')
    .select('*')
    .in('company_id', companyIds)
    .is('archived_at', null)
    .order('last_name')
    .order('first_name')

  if (tutorsError) throw new Error(`fetchCompanies tutors: ${tutorsError.message}`)

  const tutors = (tutorsData as TutorRow[]) ?? []
  const tutorsByCompany = groupBy(tutors, (tutor) => tutor.company_id)

  const search = filters.search?.trim().toLowerCase()
  if (search) {
    companies = companies.filter((company) => {
      const companyTutors = tutorsByCompany.get(company.id) ?? []
      return [
        company.name,
        company.city,
        company.zip_code,
        company.sector,
        company.professional_family,
        company.siret,
        company.siren,
        ...companyTutors.map((tutor) => `${tutor.first_name} ${tutor.last_name} ${tutor.function ?? ''} ${tutor.email ?? ''}`),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search))
    })
  }

  return companies.map((company) => ({
    company,
    tutors: tutorsByCompany.get(company.id) ?? [],
  }))
}

export async function fetchCompanyById(id: string): Promise<CompanyDetail | null> {
  const sb = getSupabase()
  const { data: companyData, error: companyError } = await sb
    .from('companies')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle()

  if (companyError) throw new Error(`fetchCompanyById company: ${companyError.message}`)

  const company = (companyData as CompanyRow | null) ?? null
  if (!company) return null

  const [tutorsResult, placementsResult] = await Promise.all([
    sb
      .from('tutors')
      .select('*')
      .eq('company_id', company.id)
      .is('archived_at', null)
      .order('last_name')
      .order('first_name'),
    sb
      .from('placements')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false }),
  ])

  if (tutorsResult.error) throw new Error(`fetchCompanyById tutors: ${tutorsResult.error.message}`)
  if (placementsResult.error) {
    throw new Error(`fetchCompanyById placements: ${placementsResult.error.message}`)
  }

  const tutors = (tutorsResult.data as TutorRow[]) ?? []
  const placements = (placementsResult.data as PlacementRow[]) ?? []

  const [studentsResult, periodsResult] = await Promise.all([
    placements.length > 0
      ? sb.from('students').select('*').in('id', unique(placements.map((p) => p.student_id)))
      : Promise.resolve({ data: [], error: null }),
    placements.length > 0
      ? sb.from('pfmp_periods').select('*').in('id', unique(placements.map((p) => p.period_id)))
      : Promise.resolve({ data: [], error: null }),
  ])

  if (studentsResult.error) {
    throw new Error(`fetchCompanyById students: ${studentsResult.error.message}`)
  }
  if (periodsResult.error) throw new Error(`fetchCompanyById periods: ${periodsResult.error.message}`)

  const studentById = indexById((studentsResult.data as StudentRow[]) ?? [])
  const periodById = indexById((periodsResult.data as PfmpPeriodRow[]) ?? [])
  const tutorById = indexById(tutors)

  const history = placements.map((placement) => ({
    placement,
    student: studentById.get(placement.student_id) ?? null,
    period: periodById.get(placement.period_id) ?? null,
    tutor: placement.tutor_id ? tutorById.get(placement.tutor_id) ?? null : null,
  }))

  return {
    company,
    tutors,
    placements: history,
    stats: {
      placementsCount: placements.length,
      studentsHosted: unique(placements.map((placement) => placement.student_id)).length,
      activePlacements: placements.filter((placement) => placement.status === 'in_progress').length,
      latestHostedAt: latestDate(placements.flatMap((placement) => [placement.end_date, placement.start_date])),
    },
  }
}

export function buildCompanyNetworkSummary(items: CompanyListItem[]): CompanyNetworkSummary {
  const companies = items.map((item) => item.company)
  const tutors = items.flatMap((item) => item.tutors)
  return {
    totalCompanies: companies.length,
    activeCompanies: companies.filter((company) => company.status !== 'to_avoid').length,
    strongPartners: companies.filter((company) => company.status === 'strong_partner').length,
    toRecontact: companies.filter((company) => company.status === 'to_recontact').length,
    toWatch: companies.filter((company) => company.status === 'to_watch').length,
    toAvoid: companies.filter((company) => company.status === 'to_avoid').length,
    tutorsCount: tutors.length,
    tutorsWithEmail: tutors.filter((tutor) => Boolean(tutor.email)).length,
    averageCompletionRate: averageCompletionRate(companies),
  }
}

function averageCompletionRate(companies: CompanyRow[]): number {
  if (companies.length === 0) return 0
  const total = companies.reduce((sum, company) => sum + completionRate(company), 0)
  return Math.round(total / companies.length)
}

function completionRate(company: CompanyRow): number {
  const fields = [
    company.name,
    company.address,
    company.city,
    company.zip_code,
    company.phone,
    company.email,
    company.siret,
    company.sector,
    company.professional_family,
  ]
  const completed = fields.filter(Boolean).length
  return Math.round((completed / fields.length) * 100)
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

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])]
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())
  return sorted[0] ?? null
}
