import { createFileRoute, Link, Navigate, Outlet, useMatchRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Building2, FileSpreadsheet, Mail, Phone, Plus, Star, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { CompanyFormModal, type CompanyFormValues } from '@/components/companies/CompanyFormModal'
import { CompanyImportModal } from '@/components/companies/CompanyImportModal'
import { EmptyState } from '@/components/EmptyState'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { StatCard } from '@/components/StatCard'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  buildCompanyNetworkSummary,
  fetchCompanies,
  type CompanyListItem,
} from '@/services/companies'
import {
  createCompany,
  importCompanies,
  type CompanyImportRow,
  type ImportCompaniesResult,
} from '@/server/companies.functions'
import { companies, tutors, buildCompanyIntelligence, ESTABLISHMENT_ID } from '@/data/demo'
import {
  COMPANY_RELIABILITY_LABELS,
  COMPANY_STATUS_LABELS,
  PROFESSIONAL_FAMILY_LABELS,
  TUTOR_RESPONSIVENESS_LABELS,
  type Company,
  type CompanyReliability,
  type CompanyStatus,
  type ProfessionalFamily,
  type TutorResponsiveness,
} from '@/types'
import type { CompanyRow, TutorRow } from '@/lib/database.types'

export const Route = createFileRoute('/companies')({ component: CompaniesPage })

const PROFESSIONAL_FAMILIES = Object.keys(PROFESSIONAL_FAMILY_LABELS) as ProfessionalFamily[]
const COMPANY_STATUSES = Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[]
const COMPANY_RELIABILITIES = Object.keys(COMPANY_RELIABILITY_LABELS) as CompanyReliability[]

const RELIABILITY_TONE: Record<CompanyReliability, BadgeTone> = {
  high: 'success',
  medium: 'neutral',
  low: 'warning',
  unknown: 'neutral',
}

const STATUS_TONE: Record<CompanyStatus, BadgeTone> = {
  active: 'info',
  strong_partner: 'success',
  to_recontact: 'warning',
  to_watch: 'warning',
  to_avoid: 'danger',
}

const RESPONSIVENESS_TONE: Record<TutorResponsiveness, BadgeTone> = {
  fast: 'success',
  medium: 'info',
  slow: 'warning',
  unknown: 'neutral',
}

export function CompaniesPage() {
  const matchRoute = useMatchRoute()
  const isOnChild = matchRoute({ to: '/companies/$id', fuzzy: true })
  if (isOnChild) return <Outlet />
  if (!matchRoute({ to: '/admin/companies', fuzzy: true }) && !matchRoute({ to: '/prof/companies', fuzzy: true })) {
    return <Navigate to="/admin/companies" replace />
  }
  if (isDemoMode()) return <CompaniesDemo />
  return <CompaniesSupabase />
}

export function CompaniesSupabase() {
  const auth = useAuth()
  const router = useRouterState()
  const accessToken = auth.session?.access_token ?? ''
  const establishmentId = auth.activeEstablishmentId ?? auth.establishmentId
  const isProfPortal = router.location.pathname.startsWith('/prof')
  const [query, setQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState<'all' | ProfessionalFamily>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CompanyStatus>('all')
  const [reliabilityFilter, setReliabilityFilter] = useState<'all' | CompanyReliability>('all')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [rows, setRows] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<ImportCompaniesResult | null>(null)

  const canManage =
    !isProfPortal &&
    (auth.profile?.role === 'admin' || auth.profile?.role === 'ddfpt' || auth.profile?.role === 'superadmin')

  function reload() {
    if (!auth.profile) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetchCompanies({
      search: query,
      professionalFamily: familyFilter === 'all' ? undefined : familyFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      reliability: reliabilityFilter === 'all' ? undefined : reliabilityFilter,
      includeArchived,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (auth.loading) return
    reload()
  }, [auth.loading, auth.profile, familyFilter, includeArchived, query, reliabilityFilter, statusFilter])

  const intelligence = useMemo(() => buildCompanyNetworkSummary(rows), [rows])

  async function saveCompany(values: CompanyFormValues) {
    setSubmitting(true)
    setModalError(null)
    try {
      await createCompany({ data: { accessToken, data: { ...values, establishmentId } } })
      setNotice('Entreprise creee.')
      setShowCreate(false)
      reload()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function dryRunImport(rowsToImport: CompanyImportRow[]) {
    setSubmitting(true)
    setModalError(null)
    try {
      const result = await importCompanies({
        data: { accessToken, establishmentId, rows: rowsToImport, dryRun: true },
      })
      setDryRunResult(result)
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmImport(rowsToImport: CompanyImportRow[]) {
    setSubmitting(true)
    setModalError(null)
    try {
      const result = await importCompanies({
        data: { accessToken, establishmentId, rows: rowsToImport, dryRun: false },
      })
      setNotice(`${result.created} creees, ${result.updated} mises a jour, ${result.skipped} ignorees.`)
      setShowImport(false)
      setDryRunResult(null)
      reload()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.loading || loading) return <CompaniesSkeleton />

  if (!auth.profile) {
    return (
      <BareCompaniesState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher le reseau entreprises."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Entreprises et tuteurs" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les entreprises"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Entreprises et tuteurs"
      subtitle={`${intelligence.totalCompanies} entreprises - ${intelligence.tutorsCount} tuteurs - donnees Supabase`}
      actions={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => setShowImport(true)}
            >
              Importer
            </Button>
            <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              Ajouter
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {canManage && (
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Afficher les entreprises archivees
          </label>
        )}
      </div>

      <CompaniesStats summary={intelligence} />
      <CompaniesFilters
        query={query}
        setQuery={setQuery}
        familyFilter={familyFilter}
        setFamilyFilter={setFamilyFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        reliabilityFilter={reliabilityFilter}
        setReliabilityFilter={setReliabilityFilter}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucune entreprise"
          description="Aucune entreprise ne correspond aux filtres actuels dans ce tenant."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((item) => (
            <CompanySupabaseCard key={item.company.id} item={item} />
          ))}
        </div>
      )}

      {showCreate && (
        <CompanyFormModal
          establishmentId={establishmentId}
          submitting={submitting}
          error={modalError}
          onCancel={() => {
            setShowCreate(false)
            setModalError(null)
          }}
          onSubmit={saveCompany}
        />
      )}
      {showImport && (
        <CompanyImportModal
          submitting={submitting}
          error={modalError}
          dryRunResult={dryRunResult}
          onCancel={() => {
            setShowImport(false)
            setDryRunResult(null)
            setModalError(null)
          }}
          onDryRun={dryRunImport}
          onImport={confirmImport}
        />
      )}
    </AppLayout>
  )
}

export function CompaniesDemo() {
  const [query, setQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState<'all' | ProfessionalFamily>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CompanyStatus>('all')
  const [reliabilityFilter, setReliabilityFilter] = useState<'all' | CompanyReliability>('all')

  const intelligence = useMemo(() => buildCompanyIntelligence(ESTABLISHMENT_ID), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return companies
      .filter((company) => company.establishmentId === ESTABLISHMENT_ID)
      .filter((company) => {
        if (familyFilter !== 'all' && company.professionalFamily !== familyFilter) return false
        if (statusFilter !== 'all' && company.status !== statusFilter) return false
        if (reliabilityFilter !== 'all' && company.reliability !== reliabilityFilter) return false
        if (!q) return true
        const companyTutors = tutors.filter((tutor) => tutor.companyId === company.id)
        return [
          company.name,
          company.city,
          company.sector,
          company.zipCode,
          PROFESSIONAL_FAMILY_LABELS[company.professionalFamily],
          ...companyTutors.map((tutor) => `${tutor.firstName} ${tutor.lastName} ${tutor.function}`),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [familyFilter, query, reliabilityFilter, statusFilter])

  return (
    <AppLayout
      title="Entreprises et tuteurs"
      subtitle={`${intelligence.totalCompanies} entreprises - ${intelligence.tutorsCount} tuteurs - mode demo`}
      actions={
        <Button size="sm" iconLeft={<Plus className="w-4 h-4" />}>
          Ajouter
        </Button>
      }
    >
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Entreprises actives"
          value={intelligence.activeCompanies}
          icon={<Activity className="w-4 h-4" />}
          delta={{ value: `${intelligence.totalCompanies} au total`, tone: 'neutral' }}
        />
        <StatCard
          label="Partenaires forts"
          value={intelligence.strongPartners}
          icon={<Star className="w-4 h-4" />}
          delta={{ value: 'historique fiable', tone: 'up' }}
        />
        <StatCard
          label="A relancer"
          value={intelligence.toRecontact + intelligence.toWatch}
          icon={<AlertTriangle className="w-4 h-4" />}
          delta={{
            value: `${intelligence.toRecontact} relance - ${intelligence.toWatch} surveillance`,
            tone: 'down',
          }}
        />
        <StatCard
          label="Tuteurs renseignes"
          value={`${intelligence.tutorsWithEmail}/${intelligence.tutorsCount}`}
          icon={<Users className="w-4 h-4" />}
          hint="avec adresse email"
        />
      </section>

      <CompaniesFilters
        query={query}
        setQuery={setQuery}
        familyFilter={familyFilter}
        setFamilyFilter={setFamilyFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        reliabilityFilter={reliabilityFilter}
        setReliabilityFilter={setReliabilityFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune entreprise ne correspond"
          description="Modifiez vos filtres ou elargissez la recherche."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((company) => (
            <CompanyDemoCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function CompaniesStats({ summary }: { summary: ReturnType<typeof buildCompanyNetworkSummary> }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Entreprises actives"
        value={summary.activeCompanies}
        icon={<Activity className="w-4 h-4" />}
        delta={{ value: `${summary.totalCompanies} au total`, tone: 'neutral' }}
      />
      <StatCard
        label="Partenaires forts"
        value={summary.strongPartners}
        icon={<Star className="w-4 h-4" />}
        delta={{ value: 'reseau qualifie', tone: 'up' }}
      />
      <StatCard
        label="A relancer"
        value={summary.toRecontact + summary.toWatch}
        icon={<AlertTriangle className="w-4 h-4" />}
        delta={{
          value: `${summary.toRecontact} relance - ${summary.toWatch} surveillance`,
          tone: summary.toRecontact + summary.toWatch > 0 ? 'down' : 'neutral',
        }}
      />
      <StatCard
        label="Tuteurs renseignes"
        value={`${summary.tutorsWithEmail}/${summary.tutorsCount}`}
        icon={<Users className="w-4 h-4" />}
        hint="avec adresse email"
      />
    </section>
  )
}

interface CompaniesFiltersProps {
  query: string
  setQuery: (value: string) => void
  familyFilter: 'all' | ProfessionalFamily
  setFamilyFilter: (value: 'all' | ProfessionalFamily) => void
  statusFilter: 'all' | CompanyStatus
  setStatusFilter: (value: 'all' | CompanyStatus) => void
  reliabilityFilter: 'all' | CompanyReliability
  setReliabilityFilter: (value: 'all' | CompanyReliability) => void
}

function CompaniesFilters({
  query,
  setQuery,
  familyFilter,
  setFamilyFilter,
  statusFilter,
  setStatusFilter,
  reliabilityFilter,
  setReliabilityFilter,
}: CompaniesFiltersProps) {
  return (
    <SearchFilterBar
      query={query}
      onQueryChange={setQuery}
      placeholder="Rechercher par nom, ville, secteur, SIRET ou tuteur..."
      filters={
        <>
          <Select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value as 'all' | ProfessionalFamily)}
            className="w-full sm:w-auto"
          >
            <option value="all">Toutes familles</option>
            {PROFESSIONAL_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {PROFESSIONAL_FAMILY_LABELS[family]}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | CompanyStatus)}
            className="w-full sm:w-auto"
          >
            <option value="all">Tout statut</option>
            {COMPANY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {COMPANY_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <Select
            value={reliabilityFilter}
            onChange={(e) => setReliabilityFilter(e.target.value as 'all' | CompanyReliability)}
            className="w-full sm:w-auto"
          >
            <option value="all">Toute fiabilite</option>
            {COMPANY_RELIABILITIES.map((reliability) => (
              <option key={reliability} value={reliability}>
                {COMPANY_RELIABILITY_LABELS[reliability]}
              </option>
            ))}
          </Select>
        </>
      }
    />
  )
}

function CompanySupabaseCard({ item }: { item: CompanyListItem }) {
  const router = useRouterState()
  const isProfPortal = router.location.pathname.startsWith('/prof')
  const company = item.company
  const status = asCompanyStatus(company.status)
  const reliability = asCompanyReliability(company.reliability)
  const family = asProfessionalFamily(company.professional_family)

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle icon={<Building2 className="w-4 h-4" />}>
            <Link
              to={isProfPortal ? '/prof/companies/$id' : '/admin/companies/$id'}
              params={{ id: company.id }}
              className="hover:text-[var(--color-brand-700)]"
            >
              {company.name}
            </Link>
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
            {formatAddress(company)}
          </p>
          {company.archived_at && <Badge tone="neutral">Archivee</Badge>}
        </div>
        <CompanyBadges status={status} reliability={reliability} />
      </CardHeader>
      <CardBody className="text-sm space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {family && <Badge tone="brand">{PROFESSIONAL_FAMILY_LABELS[family]}</Badge>}
          {company.sector && <Badge tone="neutral">{company.sector}</Badge>}
          <Badge tone="neutral">{company.students_hosted} eleves accueillis</Badge>
        </div>

        <ContactLine company={company} />
        <TutorsPreview tutors={item.tutors} />

        {company.internal_notes && (
          <p className="text-xs text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-md px-2 py-1.5">
            {company.internal_notes}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

function CompanyDemoCard({ company }: { company: Company }) {
  const linkedTutors = tutors.filter((tutor) => tutor.companyId === company.id)
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle icon={<Building2 className="w-4 h-4" />}>{company.name}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
            {company.address}, {company.zipCode} {company.city}
          </p>
        </div>
        <CompanyBadges status={company.status} reliability={company.reliability} />
      </CardHeader>
      <CardBody className="text-sm space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="brand">{PROFESSIONAL_FAMILY_LABELS[company.professionalFamily]}</Badge>
          <Badge tone="neutral">{company.sector}</Badge>
          <Badge tone="neutral">{company.studentsHosted} eleves accueillis</Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
          {company.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" /> {company.phone}
            </span>
          )}
          {company.email && (
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" /> {company.email}
            </span>
          )}
          {company.siret && <span>SIRET {company.siret}</span>}
        </div>

        <div className="border-t border-[var(--color-border)] pt-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
            Tuteurs ({linkedTutors.length})
          </p>
          <ul className="space-y-1.5">
            {linkedTutors.slice(0, 3).map((tutor) => (
              <li key={tutor.id} className="text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {tutor.firstName} {tutor.lastName}
                  </p>
                  <p className="text-[var(--color-text-muted)] truncate">{tutor.function}</p>
                </div>
                {tutor.responsiveness && (
                  <Badge tone={RESPONSIVENESS_TONE[tutor.responsiveness]}>
                    {TUTOR_RESPONSIVENESS_LABELS[tutor.responsiveness]}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  )
}

function CompanyBadges({
  status,
  reliability,
}: {
  status: CompanyStatus
  reliability: CompanyReliability
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 justify-end">
      <Badge tone={STATUS_TONE[status]}>{COMPANY_STATUS_LABELS[status]}</Badge>
      <Badge tone={RELIABILITY_TONE[reliability]} dot>
        {COMPANY_RELIABILITY_LABELS[reliability]}
      </Badge>
    </div>
  )
}

function ContactLine({ company }: { company: CompanyRow }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
      {company.phone && (
        <span className="inline-flex items-center gap-1">
          <Phone className="w-3 h-3" /> {company.phone}
        </span>
      )}
      {company.email && (
        <span className="inline-flex items-center gap-1 truncate">
          <Mail className="w-3 h-3" /> {company.email}
        </span>
      )}
      {company.siret && <span>SIRET {company.siret}</span>}
      {company.last_hosted_at && <span>Dernier accueil : {formatDate(company.last_hosted_at)}</span>}
    </div>
  )
}

function TutorsPreview({ tutors: linkedTutors }: { tutors: TutorRow[] }) {
  return (
    <div className="border-t border-[var(--color-border)] pt-2">
      <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
        Tuteurs ({linkedTutors.length})
      </p>
      {linkedTutors.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">Aucun tuteur enregistre.</p>
      ) : (
        <ul className="space-y-1.5">
          {linkedTutors.slice(0, 3).map((tutor) => {
            const responsiveness = asTutorResponsiveness(tutor.responsiveness)
            return (
              <li key={tutor.id} className="text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {tutor.first_name} {tutor.last_name}
                  </p>
                  <p className="text-[var(--color-text-muted)] truncate">
                    {tutor.function ?? 'Fonction non renseignee'}
                    {tutor.email ? ` - ${tutor.email}` : ''}
                  </p>
                </div>
                {responsiveness && (
                  <Badge tone={RESPONSIVENESS_TONE[responsiveness]}>
                    {TUTOR_RESPONSIVENESS_LABELS[responsiveness]}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function CompaniesSkeleton() {
  return (
    <AppLayout title="Entreprises et tuteurs" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-56 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BareCompaniesState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Building2 className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

function formatAddress(company: CompanyRow): string {
  const parts = [company.address, company.zip_code, company.city].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Adresse non renseignee'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
  })
}

function asProfessionalFamily(value: string | null): ProfessionalFamily | null {
  return PROFESSIONAL_FAMILIES.includes(value as ProfessionalFamily)
    ? (value as ProfessionalFamily)
    : null
}

function asCompanyStatus(value: string): CompanyStatus {
  return COMPANY_STATUSES.includes(value as CompanyStatus) ? (value as CompanyStatus) : 'active'
}

function asCompanyReliability(value: string): CompanyReliability {
  return COMPANY_RELIABILITIES.includes(value as CompanyReliability)
    ? (value as CompanyReliability)
    : 'unknown'
}

function asTutorResponsiveness(value: string | null): TutorResponsiveness | null {
  const values: TutorResponsiveness[] = ['fast', 'medium', 'slow', 'unknown']
  return values.includes(value as TutorResponsiveness) ? (value as TutorResponsiveness) : null
}
