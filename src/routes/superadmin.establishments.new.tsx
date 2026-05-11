import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Plus } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { createEstablishment } from '@/services/superadmin'
import {
  inviteUserToEstablishment,
  type InviteUserRole,
} from '@/server/invitations.functions'

export const Route = createFileRoute('/superadmin/establishments/new')({
  component: NewEstablishmentPage,
})

const DEFAULT_SCHOOL_YEAR = '2025-2026'
const DEFAULT_PRIMARY_COLOR = '#1e3a8a'
const DEFAULT_TEACHER_LOAD_THRESHOLD = 6
const COLOR_RE = /^#[0-9a-f]{6}$/i

function NewEstablishmentPage() {
  if (isDemoMode()) {
    return (
      <AppLayout title="Nouvel etablissement" subtitle="Creation tenant">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Creation indisponible en mode demo"
          description="Passez en mode Supabase pour creer un etablissement reel."
          action={
            <Link to="/superadmin/establishments">
              <Button variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
                Retour aux etablissements
              </Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  return <NewEstablishmentSupabase />
}

function NewEstablishmentSupabase() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [uai, setUai] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [schoolYear, setSchoolYear] = useState(DEFAULT_SCHOOL_YEAR)
  const [teacherLoadThreshold, setTeacherLoadThreshold] = useState(
    String(DEFAULT_TEACHER_LOAD_THRESHOLD),
  )
  const [rgpdNotice, setRgpdNotice] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminRole, setAdminRole] = useState<InviteUserRole>('ddfpt')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const normalizedSlug = useMemo(() => slugify(slug), [slug])
  const thresholdNumber = Number.parseInt(teacherLoadThreshold, 10)

  const layoutActions = (
    <Link to="/superadmin/establishments">
      <Button variant="secondary" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />}>
        Retour
      </Button>
    </Link>
  )

  if (auth.loading) {
    return (
      <AppLayout
        title="Nouvel etablissement"
        subtitle="Creation tenant Supabase"
        actions={layoutActions}
      >
        <EmptyState title="Chargement de la session" description="Verification du role superadmin..." />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout
        title="Nouvel etablissement"
        subtitle="Creation tenant Supabase"
        actions={layoutActions}
      >
        <EmptyState
          title="Session requise"
          description="Connectez-vous avec un compte superadmin pour creer un etablissement."
          action={
            <Link to="/login">
              <Button>Retour a la connexion</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  if (auth.role !== 'superadmin') {
    return (
      <AppLayout
        title="Nouvel etablissement"
        subtitle="Creation tenant Supabase"
        actions={layoutActions}
      >
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Acces reserve aux superadmins"
          description="Votre role actuel ne permet pas de creer un tenant."
        />
      </AppLayout>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const cleanName = name.trim()
    const cleanSlug = normalizedSlug
    const cleanColor = primaryColor.trim().toLowerCase() || null
    const cleanSchoolYear = schoolYear.trim() || null

    if (!cleanName) {
      setError("Le nom de l'etablissement est obligatoire.")
      return
    }
    if (!cleanSlug) {
      setError('Le slug est obligatoire.')
      return
    }
    if (cleanColor && !COLOR_RE.test(cleanColor)) {
      setError('La couleur primaire doit etre au format #RRGGBB.')
      return
    }
    if (!Number.isInteger(thresholdNumber) || thresholdNumber < 1 || thresholdNumber > 30) {
      setError('Le seuil de charge doit etre un nombre entre 1 et 30.')
      return
    }
    const shouldInviteAdmin = Boolean(adminEmail.trim())
    if (shouldInviteAdmin && !auth.session?.access_token) {
      setError('Session superadmin introuvable. Reconnectez-vous avant d inviter un admin.')
      return
    }
    if (shouldInviteAdmin && (!adminFirstName.trim() || !adminLastName.trim())) {
      setError('Prenom et nom du premier admin sont obligatoires si vous renseignez son email.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createEstablishment({
        name: cleanName,
        city: city.trim() || null,
        uai: normalizeOptionalUpper(uai),
        slug: cleanSlug,
        primaryColor: cleanColor,
        schoolYear: cleanSchoolYear,
        teacherLoadThreshold: thresholdNumber,
      })
      if (shouldInviteAdmin && auth.session?.access_token) {
        await inviteUserToEstablishment({
          data: {
            accessToken: auth.session.access_token,
            establishmentId: result.establishment.id,
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: adminRole,
          },
        })
      }

      setSuccess(
        shouldInviteAdmin
          ? `${result.establishment.name} cree, invitation envoyee.`
          : `${result.establishment.name} cree.`,
      )
      window.setTimeout(() => {
        navigate({ to: '/superadmin/establishments' })
      }, 650)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout
      title="Nouvel etablissement"
      subtitle="Creation d'un tenant PFMP Pilot AI"
      actions={layoutActions}
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>
                Identite de l'etablissement
              </CardTitle>
              <CardDescription>
                Creez le tenant et invitez le premier DDFPT ou administrateur de l'etablissement.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nom de l'etablissement</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => {
                    const nextName = event.target.value
                    setName(nextName)
                    if (!slugTouched) setSlug(slugify(nextName))
                  }}
                  placeholder="Lycee professionnel Jean Moulin"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Lyon"
                />
              </div>
              <div>
                <Label htmlFor="uai">UAI</Label>
                <Input
                  id="uai"
                  value={uai}
                  onChange={(event) => setUai(event.target.value.toUpperCase())}
                  placeholder="0123456A"
                  maxLength={8}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug tenant</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(slugify(event.target.value))
                  }}
                  placeholder="lycee-jean-moulin"
                  required
                />
                <FieldHint>Utilise pour les URLs et le futur routage multi-tenant.</FieldHint>
              </div>
              <div>
                <Label htmlFor="primaryColor">Couleur primaire</Label>
                <Input
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  placeholder="#1e3a8a"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Premier admin / DDFPT</CardTitle>
              <CardDescription>
                Optionnel mais recommande : invitez tout de suite la personne qui gerera le tenant.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminFirstName">Prenom</Label>
                <Input
                  id="adminFirstName"
                  value={adminFirstName}
                  onChange={(event) => setAdminFirstName(event.target.value)}
                  placeholder="Nadia"
                />
              </div>
              <div>
                <Label htmlFor="adminLastName">Nom</Label>
                <Input
                  id="adminLastName"
                  value={adminLastName}
                  onChange={(event) => setAdminLastName(event.target.value)}
                  placeholder="Martin"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="prenom.nom@ac-academie.fr"
                />
              </div>
              <div>
                <Label htmlFor="adminRole">Role initial</Label>
                <select
                  id="adminRole"
                  value={adminRole}
                  onChange={(event) => setAdminRole(event.target.value as InviteUserRole)}
                  className="w-full bg-white border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-500)]"
                >
                  <option value="ddfpt">DDFPT</option>
                  <option value="admin">Admin etablissement</option>
                </select>
              </div>
            </div>
            <FieldHint>
              L'invitation utilise Supabase Auth. Si l'email est vide, seul le tenant sera cree.
            </FieldHint>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Parametres initiaux</CardTitle>
              <CardDescription>
                Ces valeurs pourront etre modifiees plus tard dans les parametres du tenant.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolYear">Annee scolaire</Label>
                <Input
                  id="schoolYear"
                  value={schoolYear}
                  onChange={(event) => setSchoolYear(event.target.value)}
                  placeholder="2025-2026"
                />
              </div>
              <div>
                <Label htmlFor="teacherLoadThreshold">Seuil charge referent</Label>
                <Input
                  id="teacherLoadThreshold"
                  type="number"
                  min={1}
                  max={30}
                  value={teacherLoadThreshold}
                  onChange={(event) => setTeacherLoadThreshold(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rgpdNotice">Note RGPD interne</Label>
              <Textarea
                id="rgpdNotice"
                value={rgpdNotice}
                onChange={(event) => setRgpdNotice(event.target.value)}
                placeholder="Optionnel pour ce sprint. Les notices completes arrivent avec l'onboarding."
                disabled
              />
              <FieldHint>
                Champ visible mais desactive volontairement : le module RGPD complet arrive plus tard.
              </FieldHint>
            </div>
          </CardBody>
          <CardFooter className="gap-3 justify-end">
            {error && (
              <p className="mr-auto text-sm font-medium text-[var(--color-danger)]">{error}</p>
            )}
            {success && (
              <p className="mr-auto inline-flex items-center gap-2 text-sm font-medium text-[var(--color-success-fg)]">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </p>
            )}
            <Link to="/superadmin/establishments">
              <Button type="button" variant="secondary" disabled={submitting}>
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              iconLeft={<Plus className="w-4 h-4" />}
              disabled={submitting}
            >
              {submitting ? 'Creation...' : 'Creer le tenant'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </AppLayout>
  )
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeOptionalUpper(value: string): string | null {
  const clean = value.trim().toUpperCase()
  return clean ? clean : null
}
