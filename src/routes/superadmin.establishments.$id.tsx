import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Database,
  Globe2,
  Settings,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { InviteUserForm } from '@/components/InviteUserForm'
import { TenantAccessCard } from '@/components/TenantAccessCard'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchEstablishmentDetail,
  type EstablishmentDetail,
} from '@/services/superadmin'
import {
  classes as demoClasses,
  establishments as demoEstablishments,
  pfmpPeriods as demoPeriods,
  profiles as demoProfiles,
} from '@/data/demo'
import type { EstablishmentRow, EstablishmentStatus } from '@/lib/database.types'

export const Route = createFileRoute('/superadmin/establishments/$id')({
  component: EstablishmentDetailPage,
})

const STATUS_LABELS: Record<EstablishmentStatus, string> = {
  active: 'Actif',
  trial: 'Essai',
  suspended: 'Suspendu',
  archived: 'Archive',
}

const STATUS_TONES: Record<EstablishmentStatus, BadgeTone> = {
  active: 'success',
  trial: 'info',
  suspended: 'warning',
  archived: 'neutral',
}

function EstablishmentDetailPage() {
  const { id } = useParams({ from: '/superadmin/establishments/$id' })
  if (isDemoMode()) return <EstablishmentDemoDetail id={id} />
  return <EstablishmentSupabaseDetail id={id} />
}

function EstablishmentSupabaseDetail({ id }: { id: string }) {
  const auth = useAuth()
  const [detail, setDetail] = useState<EstablishmentDetail | null>(null)
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

    fetchEstablishmentDetail(id)
      .then((next) => {
        if (mounted) setDetail(next)
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
      <AppLayout title="Etablissement" subtitle="Chargement du tenant">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Chargement de l'etablissement"
          description="Lecture des donnees Supabase du tenant."
        />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Session requise" subtitle="Vue Superadmin">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session requise"
          description="Connectez-vous avec un compte superadmin pour afficher ce tenant."
          action={<BackToEstablishments />}
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Etablissement" subtitle="Vue Superadmin">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger l'etablissement"
          description={error}
          action={<BackToEstablishments />}
        />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Etablissement introuvable" subtitle="Vue Superadmin">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Etablissement introuvable"
          description="Cet etablissement n'existe pas ou n'est pas accessible avec cette session."
          action={<BackToEstablishments />}
        />
      </AppLayout>
    )
  }

  return <EstablishmentDetailLayout detail={detail} />
}

function EstablishmentDemoDetail({ id }: { id: string }) {
  const item = demoEstablishments.find((establishment) => establishment.id === id)

  if (!item) {
    return (
      <AppLayout title="Etablissement demo" subtitle="Mode demo">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Etablissement demo introuvable"
          description="Cette fiche demo n'existe pas."
          action={<BackToEstablishments />}
        />
      </AppLayout>
    )
  }

  const establishment: EstablishmentRow = {
    id: item.id,
    name: item.name,
    city: item.city,
    uai: item.uai ?? null,
    slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    subdomain: null,
    custom_domain: null,
    domain_verified: false,
    primary_color: '#1d4ed8',
    status: item.active ? 'active' : 'suspended',
    active: item.active,
    created_at: item.createdAt,
    updated_at: item.createdAt,
  }

  const detail: EstablishmentDetail = {
    establishment,
    settings: null,
    profiles: [],
    classes: [],
    periods: [],
    auditLogs: [],
    metrics: {
      users: item.userCount,
      classes: demoClasses.filter((classe) => classe.establishmentId === id).length,
      students: item.studentCount,
      teachers: demoProfiles.filter((profile) => profile.establishmentId === id).length,
      companies: item.companyCount ?? 0,
      periods: demoPeriods.filter((period) => period.establishmentId === id).length,
      visits: 0,
      documents: 0,
      openAlerts: 0,
    },
  }

  return <EstablishmentDetailLayout detail={detail} />
}

function EstablishmentDetailLayout({ detail }: { detail: EstablishmentDetail }) {
  const { establishment, settings, metrics, profiles, periods, auditLogs } = detail

  return (
    <AppLayout
      title={establishment.name}
      subtitle="Vue Superadmin - detail du tenant"
      actions={<BackToEstablishments />}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONES[establishment.status]} dot>
            {STATUS_LABELS[establishment.status]}
          </Badge>
          {establishment.active ? (
            <Badge tone="success">Tenant actif</Badge>
          ) : (
            <Badge tone="neutral">Tenant inactif</Badge>
          )}
          {establishment.domain_verified ? (
            <Badge tone="success">Domaine verifie</Badge>
          ) : (
            <Badge tone="neutral">Domaine non verifie</Badge>
          )}
        </div>

        <TenantAccessCard establishment={establishment} />

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Eleves" value={metrics.students} icon={<Users className="w-4 h-4" />} />
          <MetricCard label="Utilisateurs" value={metrics.users} icon={<Users className="w-4 h-4" />} />
          <MetricCard label="Classes" value={metrics.classes} icon={<Database className="w-4 h-4" />} />
          <MetricCard label="Entreprises" value={metrics.companies} icon={<Building2 className="w-4 h-4" />} />
          <MetricCard label="Periodes PFMP" value={metrics.periods} icon={<CalendarDays className="w-4 h-4" />} />
          <MetricCard label="Visites" value={metrics.visits} icon={<CalendarDays className="w-4 h-4" />} />
          <MetricCard label="Documents" value={metrics.documents} icon={<Database className="w-4 h-4" />} />
          <MetricCard label="Alertes ouvertes" value={metrics.openAlerts} icon={<AlertTriangle className="w-4 h-4" />} />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle icon={<Building2 className="w-4 h-4" />}>Identite tenant</CardTitle>
              </CardHeader>
              <CardBody className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoLine label="Ville" value={establishment.city ?? '-'} />
                <InfoLine label="UAI" value={establishment.uai ?? '-'} />
                <InfoLine label="Slug" value={establishment.slug} />
                <InfoLine label="Couleur" value={establishment.primary_color ?? '-'} />
                <InfoLine label="Cree le" value={formatDate(establishment.created_at)} />
                <InfoLine label="Mis a jour le" value={formatDate(establishment.updated_at)} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<Globe2 className="w-4 h-4" />}>Domaines</CardTitle>
              </CardHeader>
              <CardBody className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoLine label="Sous-domaine" value={establishment.subdomain ?? '-'} />
                <InfoLine label="Domaine custom" value={establishment.custom_domain ?? '-'} />
                <InfoLine label="Verification" value={establishment.domain_verified ? 'Verifie' : 'Non verifie'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<Settings className="w-4 h-4" />}>Parametres</CardTitle>
              </CardHeader>
              <CardBody className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoLine label="Annee scolaire" value={settings?.school_year ?? '-'} />
                <InfoLine label="Seuil charge referent" value={String(settings?.teacher_load_threshold ?? '-')} />
                <InfoLine label="IA active" value={settings?.ai_enabled ? 'Oui' : 'Non'} />
                <InfoLine label="Logo" value={settings?.logo_url ?? '-'} />
              </CardBody>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle icon={<Users className="w-4 h-4" />}>Inviter un compte</CardTitle>
              </CardHeader>
              <CardBody>
                <InviteUserForm
                  establishmentId={establishment.id}
                  allowedRoles={['admin', 'ddfpt', 'principal', 'referent', 'tuteur', 'eleve']}
                  defaultRole="ddfpt"
                  compact
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<Users className="w-4 h-4" />}>Utilisateurs</CardTitle>
                <Badge tone="neutral">{profiles.length}</Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                {profiles.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Aucun utilisateur invite pour l'instant.</p>
                ) : (
                  profiles.slice(0, 8).map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{profile.email}</p>
                      </div>
                      <Badge tone="brand">{profile.role}</Badge>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<CalendarDays className="w-4 h-4" />}>Periodes PFMP</CardTitle>
                <Badge tone="neutral">{periods.length}</Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                {periods.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Aucune periode PFMP creee.</p>
                ) : (
                  periods.slice(0, 6).map((period) => (
                    <div
                      key={period.id}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{period.name}</p>
                        <Badge tone="neutral">{period.status}</Badge>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                      </p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<Database className="w-4 h-4" />}>Activite recente</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Aucune activite enregistree.</p>
                ) : (
                  auditLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="border-l-2 border-[var(--color-brand-100)] pl-3 py-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {log.description ?? 'Action systeme'} - {formatDate(log.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  )
}

function BackToEstablishments() {
  return (
    <Link to="/superadmin/establishments">
      <Button size="sm" variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
        Retour
      </Button>
    </Link>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{value}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-medium text-[var(--color-text)] break-words">{value}</p>
    </div>
  )
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}
