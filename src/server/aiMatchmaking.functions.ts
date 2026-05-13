import { createServerFn } from '@tanstack/react-start'
import type { ClassRow, CompanyRow, PlacementRow, ProfileRow, StudentRow, UserRole } from '@/lib/database.types'
import type { ProfessionalFamily } from '@/types'
import {
  clean,
  createAdminClient,
  getCallerProfile,
  safeHandlerCall,
  validateUuid,
  type AdminClient,
} from './_lib'

export interface CompanySuggestion {
  company: CompanyRow
  score: number
  reasons: string[]
}

export interface MatchmakingResult {
  student: StudentRow
  class: ClassRow | null
  suggestions: CompanySuggestion[]
}

const MATCHMAKING_ROLES: UserRole[] = ['admin', 'ddfpt', 'principal', 'superadmin']
const FAMILY_KEYWORDS: Array<{ family: ProfessionalFamily; patterns: RegExp[] }> = [
  { family: 'automobile', patterns: [/auto/i, /mva/i, /mspc/i, /meca/i, /vehicule/i, /carrosserie/i] },
  { family: 'commerce_vente', patterns: [/commerce/i, /vente/i, /mrc/i, /accueil/i] },
  { family: 'gestion_administration', patterns: [/gestion/i, /admin/i, /agora/i, /ga/i] },
  { family: 'hotellerie_restauration', patterns: [/hotel/i, /restauration/i, /cuisine/i, /service/i] },
  { family: 'sante_social', patterns: [/sante/i, /social/i, /assp/i, /spvl/i] },
  { family: 'numerique', patterns: [/numeric/i, /ciel/i, /sn/i, /informatique/i] },
  { family: 'industrie', patterns: [/industrie/i, /mei/i, /mspc/i, /productique/i, /usinage/i] },
  { family: 'btp', patterns: [/btp/i, /batiment/i, /construction/i, /bois/i] },
  { family: 'transport_logistique', patterns: [/transport/i, /logistique/i, /otl/i] },
]

export const suggestCompaniesForStudent = createServerFn({ method: 'POST' })
  .inputValidator(validateSuggestInput)
  .handler(async ({ data }): Promise<MatchmakingResult> => {
    return safeHandlerCall(async () => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertCanUseMatchmaking(caller)

      const student = await getStudentById(adminClient, data.studentId)
      const klass = student.class_id ? await getClassById(adminClient, student.class_id) : null
      assertCanReadStudent(caller, student, klass, data.establishmentId)

      const [companies, previousPlacements] = await Promise.all([
        fetchActiveCompanies(adminClient, student.establishment_id),
        fetchPreviousPlacements(adminClient, student.id),
      ])

      const scored = companies
        .map((company) => scoreCompany(student, klass, company, previousPlacements))
        .sort((a, b) => b.score - a.score)

      const preferred = scored.filter((item) => item.company.status !== 'to_avoid')
      const suggestions = (preferred.length >= 3 ? preferred : scored).slice(0, 3)
      return { student, class: klass, suggestions }
    })
  })

function scoreCompany(
  student: StudentRow,
  klass: ClassRow | null,
  company: CompanyRow,
  previousPlacements: PlacementRow[],
): CompanySuggestion {
  let score = 0
  const reasons: string[] = []
  const formationSignals = [
    klass?.name,
    klass?.formation,
    student.formation,
  ].filter(Boolean).map((value) => normalize(value ?? ''))
  const companyFormations = (company.compatible_formations ?? []).map(normalize)

  const exactFormation = formationSignals.some((signal) =>
    companyFormations.some((formation) => formation.includes(signal) || signal.includes(formation)),
  )
  if (exactFormation) {
    score += 40
    reasons.push(`Compatible avec ${klass?.name ?? student.formation ?? 'la formation eleve'}`)
  } else if (companyFormations.length > 0 && formationSignals.some((signal) => sameFormationFamily(signal, companyFormations))) {
    score += 20
    reasons.push('Formation proche des accueils habituels')
  }

  const expectedFamily = inferProfessionalFamily(klass, student)
  if (expectedFamily && company.professional_family === expectedFamily) {
    score += 20
    reasons.push(`Famille professionnelle coherente: ${expectedFamily}`)
  }

  const alreadyVisited = previousPlacements.some((placement) => placement.company_id === company.id)
  if (!alreadyVisited) {
    score += 15
    reasons.push('Nouveau partenaire pour cet eleve')
  } else {
    reasons.push('Deja visite par cet eleve')
  }

  const reliabilityScore = reliabilityPoints(company.reliability)
  score += reliabilityScore
  if (reliabilityScore >= 15) reasons.push('Fiabilite elevee')
  if (reliabilityScore === 10) reasons.push('Fiabilite correcte')

  if (company.status === 'strong_partner') {
    score += 10
    reasons.push('Partenaire privilegie du lycee')
  }
  if (company.status === 'to_avoid') {
    score -= 50
    reasons.push('Entreprise a eviter')
  }

  const capacityScore = Math.max(0, 10 - Math.min(company.students_hosted ?? 0, 10))
  score += capacityScore
  if (capacityScore >= 7) reasons.push('Capacite probable disponible')

  if (reasons.length === 0) reasons.push('Entreprise active du referentiel')
  return { company, score: Math.max(0, score), reasons }
}

async function fetchActiveCompanies(adminClient: AdminClient, establishmentId: string): Promise<CompanyRow[]> {
  const { data, error } = await adminClient
    .from('companies')
    .select('*')
    .eq('establishment_id', establishmentId)
    .is('archived_at', null)
  if (error) throw new Error(`Lecture entreprises matchmaking impossible: ${error.message}`)
  return (data as unknown as CompanyRow[]) ?? []
}

async function fetchPreviousPlacements(adminClient: AdminClient, studentId: string): Promise<PlacementRow[]> {
  const { data, error } = await adminClient
    .from('placements')
    .select('*')
    .eq('student_id', studentId)
    .is('archived_at', null)
  if (error) throw new Error(`Lecture historique eleve impossible: ${error.message}`)
  return (data as unknown as PlacementRow[]) ?? []
}

async function getStudentById(adminClient: AdminClient, studentId: string): Promise<StudentRow> {
  const { data, error } = await adminClient.from('students').select('*').eq('id', studentId).maybeSingle()
  if (error) throw new Error(`Lecture eleve impossible: ${error.message}`)
  if (!data) throw new Error('Eleve introuvable.')
  return data as unknown as StudentRow
}

async function getClassById(adminClient: AdminClient, classId: string): Promise<ClassRow> {
  const { data, error } = await adminClient.from('classes').select('*').eq('id', classId).maybeSingle()
  if (error) throw new Error(`Lecture classe impossible: ${error.message}`)
  if (!data) throw new Error('Classe introuvable.')
  return data as unknown as ClassRow
}

function assertCanUseMatchmaking(caller: ProfileRow): void {
  if (!MATCHMAKING_ROLES.includes(caller.role)) throw new Error('Acces refuse: suggestions reservees aux equipes pedagogiques.')
}

function assertCanReadStudent(
  caller: ProfileRow,
  student: StudentRow,
  klass: ClassRow | null,
  requested?: string | null,
): void {
  if (caller.role === 'superadmin') {
    if (requested && requested !== student.establishment_id) throw new Error('Acces refuse: etablissement non autorise.')
    return
  }
  if (!caller.establishment_id || caller.establishment_id !== student.establishment_id) {
    throw new Error('Acces refuse: eleve hors tenant.')
  }
  if (caller.role === 'admin' || caller.role === 'ddfpt') return
  if (caller.role === 'principal' && klass?.principal_id === caller.id) return
  throw new Error('Acces refuse: eleve non autorise pour le matchmaking.')
}

function inferProfessionalFamily(klass: ClassRow | null, student: StudentRow): ProfessionalFamily | null {
  const haystack = normalize([klass?.name, klass?.formation, student.formation].filter(Boolean).join(' '))
  for (const candidate of FAMILY_KEYWORDS) {
    if (candidate.patterns.some((pattern) => pattern.test(haystack))) return candidate.family
  }
  return null
}

function sameFormationFamily(signal: string, companyFormations: string[]): boolean {
  const family = FAMILY_KEYWORDS.find((candidate) => candidate.patterns.some((pattern) => pattern.test(signal)))
  if (!family) return false
  return companyFormations.some((formation) => family.patterns.some((pattern) => pattern.test(formation)))
}

function reliabilityPoints(value: string | null): number {
  if (value === 'high') return 15
  if (value === 'medium') return 10
  if (value === 'low') return 5
  return 0
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function validateSuggestInput(data: unknown): { accessToken: string; studentId: string; establishmentId: string | null } {
  const record = asRecord(data)
  return {
    accessToken: requiredString(record.accessToken, 'Session'),
    studentId: validateUuid(record.studentId, 'Eleve'),
    establishmentId: optionalUuid(record.establishmentId, 'Etablissement'),
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

function optionalUuid(value: unknown, label: string): string | null {
  const uuid = clean(value)
  return uuid ? validateUuid(uuid, label) : null
}
