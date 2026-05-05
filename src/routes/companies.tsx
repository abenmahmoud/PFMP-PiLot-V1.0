import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Plus, Building2, Mail, Phone, Users, Star, AlertTriangle, Activity } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Field'
import { StatCard } from '@/components/StatCard'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { EmptyState } from '@/components/EmptyState'
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
import type { BadgeTone } from '@/components/ui/Badge'

export const Route = createFileRoute('/companies')({ component: CompaniesPage })

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

function CompaniesPage() {
  const [query, setQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState<'all' | ProfessionalFamily>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CompanyStatus>('all')
  const [reliabilityFilter, setReliabilityFilter] = useState<'all' | CompanyReliability>('all')

  const intelligence = useMemo(() => buildCompanyIntelligence(ESTABLISHMENT_ID), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return companies
      .filter((c) => c.establishmentId === ESTABLISHMENT_ID)
      .filter((c) => {
        if (familyFilter !== 'all' && c.professionalFamily !== familyFilter) return false
        if (statusFilter !== 'all' && c.status !== statusFilter) return false
        if (reliabilityFilter !== 'all' && c.reliability !== reliabilityFilter) return false
        if (!q) return true
        const hay = [
          c.name,
          c.city,
          c.sector,
          c.zipCode,
          PROFESSIONAL_FAMILY_LABELS[c.professionalFamily],
          ...tutors
            .filter((t) => t.companyId === c.id)
            .map((t) => `${t.firstName} ${t.lastName} ${t.function}`),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
  }, [query, familyFilter, statusFilter, reliabilityFilter])

  const sortedFamilies = Object.entries(PROFESSIONAL_FAMILY_LABELS) as Array<
    [ProfessionalFamily, string]
  >
  const sortedStatuses = Object.entries(COMPANY_STATUS_LABELS) as Array<
    [CompanyStatus, string]
  >
  const sortedReliability = Object.entries(COMPANY_RELIABILITY_LABELS) as Array<
    [CompanyReliability, string]
  >

  return (
    <AppLayout
      title="Entreprises et tuteurs"
      subtitle={`${intelligence.totalCompanies} entreprises · ${intelligence.tutorsCount} tuteurs · base à ${intelligence.averageCompletionRate}% complétée`}
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
          label="À relancer"
          value={intelligence.toRecontact + intelligence.toWatch}
          icon={<AlertTriangle className="w-4 h-4" />}
          delta={{
            value: `${intelligence.toRecontact} relance · ${intelligence.toWatch} surveillance`,
            tone: 'down',
          }}
        />
        <StatCard
          label="Tuteurs renseignés"
          value={`${intelligence.tutorsWithEmail}/${intelligence.tutorsCount}`}
          icon={<Users className="w-4 h-4" />}
          hint="avec adresse email"
        />
      </section>

      <SearchFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Rechercher par nom, ville, secteur ou tuteur…"
        filters={
          <>
            <Select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value as 'all' | ProfessionalFamily)}
              className="w-full sm:w-auto"
            >
              <option value="all">Toutes familles</option>
              {sortedFamilies.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | CompanyStatus)}
              className="w-full sm:w-auto"
            >
              <option value="all">Tout statut</option>
              {sortedStatuses.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={reliabilityFilter}
              onChange={(e) => setReliabilityFilter(e.target.value as 'all' | CompanyReliability)}
              className="w-full sm:w-auto"
            >
              <option value="all">Toute fiabilité</option>
              {sortedReliability.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune entreprise ne correspond"
          description="Modifiez vos filtres ou élargissez la recherche."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        TODO — accès tuteur entreprise par lien sécurisé (magic link), import CSV/Excel et
        synchronisation INSEE/SIRENE seront branchés ultérieurement.
      </p>
    </AppLayout>
  )
}

function CompanyCard({ company }: { company: Company }) {
  const linkedTutors = tutors.filter((t) => t.companyId === company.id)
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle icon={<Building2 className="w-4 h-4" />}>{company.name}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
            {company.address}, {company.zipCode} {company.city}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <Badge tone={STATUS_TONE[company.status]}>
            {COMPANY_STATUS_LABELS[company.status]}
          </Badge>
          <Badge tone={RELIABILITY_TONE[company.reliability]} dot>
            {COMPANY_RELIABILITY_LABELS[company.reliability]}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="text-sm space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="brand">{PROFESSIONAL_FAMILY_LABELS[company.professionalFamily]}</Badge>
          <Badge tone="neutral">{company.sector}</Badge>
          <Badge tone="neutral">{company.studentsHosted} élèves accueillis</Badge>
        </div>

        {company.compatibleFormations.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
              Formations compatibles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {company.compatibleFormations.map((f) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-text)]"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

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
          {company.lastHostedAt && (
            <span>
              Dernier accueil :{' '}
              {new Date(company.lastHostedAt).toLocaleDateString('fr-FR', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {company.internalNotes && (
          <p className="text-xs text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-md px-2 py-1.5">
            {company.internalNotes}
          </p>
        )}

        <div className="border-t border-[var(--color-border)] pt-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
            Tuteurs ({linkedTutors.length})
          </p>
          {linkedTutors.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Aucun tuteur enregistré.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {linkedTutors.map((t) => (
                <li
                  key={t.id}
                  className="text-xs flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {t.firstName} {t.lastName}
                    </p>
                    <p className="text-[var(--color-text-muted)] truncate">
                      {t.function}
                      {t.email ? ` · ${t.email}` : ''}
                    </p>
                  </div>
                  {t.responsiveness && (
                    <Badge tone={RESPONSIVENESS_TONE[t.responsiveness]}>
                      {TUTOR_RESPONSIVENESS_LABELS[t.responsiveness]}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {company.history && company.history.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">
              Historique
            </p>
            <ul className="space-y-1 list-disc list-inside text-xs text-[var(--color-text-muted)]">
              {company.history.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
