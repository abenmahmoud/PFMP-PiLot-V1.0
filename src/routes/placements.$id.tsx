import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, ClipboardCheck, FileText, User } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { PlacementCard } from '@/components/PlacementCard'
import { StageStatusBadge, DocumentStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchPlacementById, type PlacementDetail } from '@/services/placements'
import { placements } from '@/data/demo'
import type { StageStatus } from '@/lib/database.types'

export const Route = createFileRoute('/placements/$id')({ component: PlacementDetailPage })

const STAGE_STEPS: StageStatus[] = [
  'no_stage',
  'found',
  'pending_convention',
  'signed_convention',
  'in_progress',
  'completed',
]

function PlacementDetailPage() {
  if (isDemoMode()) return <PlacementDetailDemo />
  return <PlacementDetailSupabase />
}

function PlacementDetailSupabase() {
  const { id } = useParams({ from: '/placements/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<PlacementDetail | null>(null)
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

    fetchPlacementById(id)
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

  if (auth.loading || loading) {
    return (
      <AppLayout title="Fiche stage" subtitle="Lecture des donnees Supabase...">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
          <div className="h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        </div>
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Fiche stage" subtitle="Session requise">
        <EmptyState
          title="Session requise"
          description="Connectez-vous avec un compte Supabase pour afficher cette fiche stage."
          action={<BackToStudents />}
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Fiche stage" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger le stage"
          description={error}
          action={<BackToStudents />}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Stage introuvable" subtitle="Donnees Supabase">
        <EmptyState
          title="Stage introuvable ou inaccessible"
          description="Ce stage n'existe pas ou n'est pas visible dans votre tenant."
          action={<BackToStudents />}
        />
      </AppLayout>
    )
  }

  return <PlacementDetailLayout detail={detail} />
}

function PlacementDetailDemo() {
  const { id } = useParams({ from: '/placements/$id' })
  const placement = placements.find((p) => p.id === id)
  return (
    <AppLayout title="Fiche stage" subtitle="Mode demo">
      {placement ? (
        <div className="max-w-2xl">
          <PlacementCard placement={placement} />
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Vue detaillee prochainement : documents, visites, historique, actions rapides.
          </p>
        </div>
      ) : (
        <EmptyState title="Stage introuvable" action={<BackToStudents />} />
      )}
    </AppLayout>
  )
}

function PlacementDetailLayout({ detail }: { detail: PlacementDetail }) {
  const { placement, student, period, company, tutor, referent, visits, documents } = detail

  return (
    <AppLayout
      title={student ? `${student.first_name} ${student.last_name}` : 'Fiche stage'}
      subtitle={period ? period.name : 'Periode non renseignee'}
    >
      <div className="mb-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-700)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux eleves
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Suivi du stage</CardTitle>
            <StageStatusBadge status={placement.status} />
          </CardHeader>
          <CardBody className="space-y-5">
            <Workflow status={placement.status} />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info label="Eleve" value={student ? `${student.first_name} ${student.last_name}` : '-'} icon={<User className="w-4 h-4" />} />
              <Info label="Referent" value={referent ? `${referent.first_name} ${referent.last_name}` : '-'} icon={<User className="w-4 h-4" />} />
              <Info label="Periode" value={period?.name ?? '-'} icon={<CalendarDays className="w-4 h-4" />} />
              <Info
                label="Dates"
                value={
                  placement.start_date && placement.end_date
                    ? `${formatDate(placement.start_date)} - ${formatDate(placement.end_date)}`
                    : '-'
                }
                icon={<CalendarDays className="w-4 h-4" />}
              />
              <Info label="Entreprise" value={company?.name ?? 'Aucune entreprise affectee'} icon={<Building2 className="w-4 h-4" />} />
              <Info
                label="Tuteur"
                value={tutor ? `${tutor.first_name} ${tutor.last_name}` : 'Aucun tuteur rattache'}
                icon={<User className="w-4 h-4" />}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<Building2 className="w-4 h-4" />}>Entreprise</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            {company ? (
              <>
                <p className="font-medium">{company.name}</p>
                <p className="text-[var(--color-text-muted)]">{formatCompanyAddress(company)}</p>
                {company.email && <p className="text-[var(--color-text-muted)]">{company.email}</p>}
                {company.phone && <p className="text-[var(--color-text-muted)]">{company.phone}</p>}
              </>
            ) : (
              <p className="text-[var(--color-text-muted)]">Aucune entreprise n'est encore rattachee a ce stage.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<ClipboardCheck className="w-4 h-4" />}>Visites</CardTitle>
          </CardHeader>
          <CardBody>
            {visits.length === 0 ? (
              <InlineEmpty message="Aucune visite rattachee a ce stage." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {visits.map((visit) => (
                  <li key={visit.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(visit.date)}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{visit.contact_type} - {visit.status}</p>
                      </div>
                      <Link to="/visits/$id" params={{ id: visit.id }} className="text-xs font-medium text-[var(--color-brand-700)]">
                        Ouvrir
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<FileText className="w-4 h-4" />}>Documents</CardTitle>
          </CardHeader>
          <CardBody>
            {documents.length === 0 ? (
              <InlineEmpty message="Aucun document rattache a ce stage." />
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => (
                  <li key={document.id} className="rounded-lg border border-[var(--color-border)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{document.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{document.type}</p>
                      </div>
                      <DocumentStatusBadge status={document.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function Workflow({ status }: { status: StageStatus }) {
  const current = status === 'interrupted' ? STAGE_STEPS.indexOf('in_progress') : STAGE_STEPS.indexOf(status)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {STAGE_STEPS.map((step, index) => (
        <div
          key={step}
          className={`rounded-lg border px-3 py-2 text-xs ${
            index <= current
              ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
              : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]'
          }`}
        >
          {step.replaceAll('_', ' ')}
        </div>
      ))}
      {status === 'interrupted' && <Badge tone="danger">interrupted</Badge>}
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-1">{label}</p>
      <p className="text-[var(--color-text)] flex items-center gap-2">
        {icon}
        {value}
      </p>
    </div>
  )
}

function InlineEmpty({ message }: { message: string }) {
  return <p className="text-sm text-[var(--color-text-muted)] text-center py-4">{message}</p>
}

function BackToStudents() {
  return (
    <Link to="/students">
      <Button iconLeft={<ArrowLeft className="w-4 h-4" />} variant="secondary">
        Retour
      </Button>
    </Link>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value))
}

function formatCompanyAddress(company: { address: string | null; zip_code: string | null; city: string | null }): string {
  const parts = [company.address, company.zip_code, company.city].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Adresse non renseignee'
}
