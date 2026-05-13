import { createFileRoute, Link, redirect, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchCompanyById, type CompanyDetail } from '@/services/companies'
import { companies, placements, students, tutors } from '@/data/demo'
import {
  COMPANY_RELIABILITY_LABELS,
  COMPANY_STATUS_LABELS,
  PROFESSIONAL_FAMILY_LABELS,
  TUTOR_RESPONSIVENESS_LABELS,
  type CompanyReliability,
  type CompanyStatus,
  type ProfessionalFamily,
  type TutorResponsiveness,
} from '@/types'
import type { CompanyRow, PlacementRow, StudentRow, TutorRow } from '@/lib/database.types'

export const Route = createFileRoute('/companies/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/admin/companies/$id', params })
  },
  component: CompanyDetailPage,
})

const PROFESSIONAL_FAMILIES = Object.keys(PROFESSIONAL_FAMILY_LABELS) as ProfessionalFamily[]
const COMPANY_STATUSES = Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[]
const COMPANY_RELIABILITIES = Object.keys(COMPANY_RELIABILITY_LABELS) as CompanyReliability[]
const TUTOR_RESPONSIVENESS = Object.keys(TUTOR_RESPONSIVENESS_LABELS) as TutorResponsiveness[]

const STATUS_TONE: Record<CompanyStatus, BadgeTone> = {
  active: 'info',
  strong_partner: 'success',
  to_recontact: 'warning',
  to_watch: 'warning',
  to_avoid: 'danger',
}

const RELIABILITY_TONE: Record<CompanyReliability, BadgeTone> = {
  high: 'success',
  medium: 'neutral',
  low: 'warning',
  unknown: 'neutral',
}

const RESPONSIVENESS_TONE: Record<TutorResponsiveness, BadgeTone> = {
  fast: 'success',
  medium: 'info',
  slow: 'warning',
  unknown: 'neutral',
}

export function CompanyDetailPage() {
  const { id } = Route.useParams()
  return <CompanyDetailContent id={id} />
}

export function CompanyDetailContent({ id }: { id: string }) {
  if (isDemoMode()) return <CompanyDemoDetail id={id} />
  return <CompanySupabaseDetail id={id} />
}

function CompanySupabaseDetail({ id }: { id: string }) {
  const auth = useAuth()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    fetchCompanyById(id)
      .then((nextDetail) => {
        if (mounted) setDetail(nextDetail)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile, id])

  if (auth.loading || loading) return <CompanySkeleton />

  if (!auth.profile) {
    return (
      <BareCompanyState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher cette entreprise."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Entreprise" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger l'entreprise"
          description={error}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Entreprise" subtitle="Donnees Supabase">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Entreprise introuvable"
          description="Cette entreprise n'existe pas ou n'est pas accessible dans ce tenant."
        />
      </AppLayout>
    )
  }

  return (
    <CompanyDetailLayout
      title={detail.company.name}
      subtitle="Fiche entreprise - donnees Supabase"
      company={detail.company}
      tutors={detail.tutors}
      placements={detail.placements}
      stats={detail.stats}
    />
  )
}

function CompanyDemoDetail({ id }: { id: string }) {
  const company = companies.find((item) => item.id === id) ?? null
  const linkedTutors = tutors.filter((tutor) => tutor.companyId === id)
  const linkedPlacements = placements
    .filter((placement) => placement.companyId === id)
    .map((placement) => ({
      placement: demoPlacementToRow(placement),
      student: demoStudentToRow(students.find((student) => student.id === placement.studentId) ?? null),
      period: null,
      tutor: demoTutorToRow(tutors.find((tutor) => tutor.id === placement.tutorId) ?? null),
    }))

  if (!company) {
    return (
      <AppLayout title="Entreprise" subtitle="Mode demo">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Entreprise introuvable"
          description="Cette fiche demo n'existe pas."
        />
      </AppLayout>
    )
  }

  return (
    <CompanyDetailLayout
      title={company.name}
      subtitle="Fiche entreprise - mode demo"
      company={demoCompanyToRow(company)}
      tutors={linkedTutors.map(demoTutorToRow).filter(Boolean) as TutorRow[]}
      placements={linkedPlacements}
      stats={{
        placementsCount: linkedPlacements.length,
        studentsHosted: new Set(linkedPlacements.map((item) => item.placement.student_id)).size,
        activePlacements: linkedPlacements.filter((item) => item.placement.status === 'in_progress').length,
        latestHostedAt: company.lastHostedAt ?? null,
      }}
    />
  )
}

interface CompanyDetailLayoutProps {
  title: string
  subtitle: string
  company: CompanyRow
  tutors: TutorRow[]
  placements: CompanyDetail['placements']
  stats: CompanyDetail['stats']
}

function CompanyDetailLayout({
  title,
  subtitle,
  company,
  tutors: linkedTutors,
  placements: linkedPlacements,
  stats,
}: CompanyDetailLayoutProps) {
  const router = useRouterState()
  const listPath = router.location.pathname.startsWith('/prof') ? '/prof/companies' : '/admin/companies'
  const status = asCompanyStatus(company.status)
  const reliability = asCompanyReliability(company.reliability)
  const family = asProfessionalFamily(company.professional_family)

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div className="mb-4">
        <Link
          to={listPath}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-700)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux entreprises
        </Link>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Stagiaires accueillis" value={stats.studentsHosted} icon={<Users className="w-4 h-4" />} />
        <MetricCard label="Placements" value={stats.placementsCount} icon={<Building2 className="w-4 h-4" />} />
        <MetricCard label="En cours" value={stats.activePlacements} icon={<CalendarDays className="w-4 h-4" />} />
        <MetricCard
          label="Tuteurs"
          value={linkedTutors.length}
          icon={<Users className="w-4 h-4" />}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>Informations generales</CardTitle>
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                <Badge tone={STATUS_TONE[status]}>{COMPANY_STATUS_LABELS[status]}</Badge>
                <Badge tone={RELIABILITY_TONE[reliability]} dot>
                  {COMPANY_RELIABILITY_LABELS[reliability]}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {family && <Badge tone="brand">{PROFESSIONAL_FAMILY_LABELS[family]}</Badge>}
                {company.sector && <Badge tone="neutral">{company.sector}</Badge>}
                {company.siret && <Badge tone="neutral">SIRET {company.siret}</Badge>}
                {company.siren && <Badge tone="neutral">SIREN {company.siren}</Badge>}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoLine icon={<MapPin className="w-4 h-4" />} value={formatAddress(company)} />
                <InfoLine icon={<Phone className="w-4 h-4" />} value={company.phone ?? 'Telephone non renseigne'} />
                <InfoLine icon={<Mail className="w-4 h-4" />} value={company.email ?? 'Email non renseigne'} />
                <InfoLine
                  icon={<CalendarDays className="w-4 h-4" />}
                  value={stats.latestHostedAt ? `Dernier accueil : ${formatDate(stats.latestHostedAt)}` : 'Aucun accueil historise'}
                />
              </div>

              {company.compatible_formations.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                    Formations compatibles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {company.compatible_formations.map((formation) => (
                      <span
                        key={formation}
                        className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-text)]"
                      >
                        {formation}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {company.internal_notes && (
                <p className="text-xs text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-md px-2 py-1.5">
                  {company.internal_notes}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<CalendarDays className="w-4 h-4" />}>Historique placements</CardTitle>
            </CardHeader>
            <CardBody>
              {linkedPlacements.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="w-5 h-5" />}
                  title="Aucun placement"
                  description="Cette entreprise n'a pas encore accueilli d'eleve dans ce tenant."
                />
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {linkedPlacements.map((item) => (
                    <div key={item.placement.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {item.student
                              ? `${item.student.first_name} ${item.student.last_name}`
                              : 'Eleve non accessible'}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.period?.name ?? 'Periode non renseignee'}
                            {item.tutor ? ` - tuteur ${item.tutor.first_name} ${item.tutor.last_name}` : ''}
                          </p>
                        </div>
                        <Badge tone="neutral">{item.placement.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle icon={<Users className="w-4 h-4" />}>Tuteurs</CardTitle>
          </CardHeader>
          <CardBody>
            {linkedTutors.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="Aucun tuteur"
                description="Aucun contact entreprise n'est encore rattache a cette fiche."
              />
            ) : (
              <ul className="space-y-3">
                {linkedTutors.map((tutor) => (
                  <TutorItem key={tutor.id} tutor={tutor} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">{label}</p>
          <p className="text-2xl font-semibold mt-2">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
          {icon}
        </div>
      </CardBody>
    </Card>
  )
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
      {icon}
      <span className="min-w-0 truncate">{value}</span>
    </div>
  )
}

function TutorItem({ tutor }: { tutor: TutorRow }) {
  const responsiveness = asTutorResponsiveness(tutor.responsiveness)
  return (
    <li className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {tutor.first_name} {tutor.last_name}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {tutor.function ?? 'Fonction non renseignee'}
          </p>
        </div>
        {responsiveness && (
          <Badge tone={RESPONSIVENESS_TONE[responsiveness]}>
            {TUTOR_RESPONSIVENESS_LABELS[responsiveness]}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
        {tutor.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {tutor.email}
          </span>
        )}
        {tutor.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {tutor.phone}
          </span>
        )}
      </div>
      {tutor.internal_notes && (
        <p className="mt-2 text-xs text-[var(--color-warning-fg)]">{tutor.internal_notes}</p>
      )}
    </li>
  )
}

function CompanySkeleton() {
  return (
    <AppLayout title="Entreprise" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <div className="h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        <div className="h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </div>
    </AppLayout>
  )
}

function BareCompanyState({ title, description }: { title: string; description: string }) {
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
    day: '2-digit',
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
  return TUTOR_RESPONSIVENESS.includes(value as TutorResponsiveness)
    ? (value as TutorResponsiveness)
    : null
}

function demoCompanyToRow(company: (typeof companies)[number]): CompanyRow {
  return {
    id: company.id,
    establishment_id: company.establishmentId,
    name: company.name,
    address: company.address,
    city: company.city,
    zip_code: company.zipCode,
    phone: company.phone ?? null,
    email: company.email ?? null,
    website: company.website ?? null,
    siret: company.siret ?? null,
    siren: company.siren ?? null,
    sector: company.sector,
    professional_family: company.professionalFamily,
    compatible_formations: company.compatibleFormations,
    students_hosted: company.studentsHosted,
    last_hosted_at: company.lastHostedAt ?? null,
    reliability: company.reliability,
    status: company.status,
    internal_notes: company.internalNotes ?? null,
    history: company.history ?? null,
    archived_at: null,
    created_at: '',
    updated_at: '',
  }
}

function demoTutorToRow(tutor: (typeof tutors)[number] | null): TutorRow | null {
  if (!tutor) return null
  return {
    id: tutor.id,
    establishment_id: tutor.establishmentId,
    company_id: tutor.companyId,
    first_name: tutor.firstName,
    last_name: tutor.lastName,
    function: tutor.function,
    email: tutor.email ?? null,
    phone: tutor.phone ?? null,
    responsiveness: tutor.responsiveness ?? null,
    internal_notes: tutor.internalNotes ?? null,
    archived_at: null,
    created_at: '',
    updated_at: '',
  }
}

function demoStudentToRow(student: (typeof students)[number] | null): StudentRow | null {
  if (!student) return null
  return {
    id: student.id,
    establishment_id: student.establishmentId,
    class_id: student.classId,
    first_name: student.firstName,
    last_name: student.lastName,
    email: student.email ?? null,
    phone: student.phone ?? null,
    formation: student.formation,
    notes: student.notes ?? null,
    referent_id: student.referentId ?? null,
    archived_at: null,
    created_at: '',
    updated_at: '',
  }
}

function demoPlacementToRow(placement: (typeof placements)[number]): PlacementRow {
  return {
    id: placement.id,
    establishment_id: placement.establishmentId,
    student_id: placement.studentId,
    period_id: placement.periodId,
    company_id: placement.companyId,
    tutor_id: placement.tutorId,
    referent_id: placement.referentId ?? null,
    start_date: placement.startDate,
    end_date: placement.endDate,
    status: placement.status,
    created_at: '',
    updated_at: '',
  }
}
