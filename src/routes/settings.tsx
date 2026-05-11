import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, FileText, Shield, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { EmptyState } from '@/components/EmptyState'
import { TenantAccessCard } from '@/components/TenantAccessCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchTenantSettings,
  updateTenantSettings,
  type TenantSettings,
  type UpdateSettingsInput,
} from '@/services/settings'
import { establishments, ESTABLISHMENT_ID } from '@/data/demo'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

const LOAD_TIMEOUT_MS = 12000
const DEFAULT_RGPD_NOTICE =
  "Les informations recueillies sont traitees par le lycee a des fins exclusivement pedagogiques. Conformement au RGPD, vous disposez d'un droit d'acces, de rectification et de suppression."

function SettingsPage() {
  if (isDemoMode()) return <SettingsDemo />
  return <SettingsSupabase />
}

function SettingsSupabase() {
  const auth = useAuth()
  const [data, setData] = useState<TenantSettings | null>(null)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [uai, setUai] = useState('')
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [threshold, setThreshold] = useState(6)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [rgpdNotice, setRgpdNotice] = useState(DEFAULT_RGPD_NOTICE)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

    withTimeout(fetchTenantSettings(auth.profile), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextData) => {
        if (!mounted) return
        setData(nextData)
        setName(nextData.establishment?.name ?? '')
        setCity(nextData.establishment?.city ?? '')
        setUai(nextData.establishment?.uai ?? '')
        setSchoolYear(nextData.settings?.school_year ?? '2025-2026')
        setThreshold(nextData.settings?.teacher_load_threshold ?? 6)
        setAiEnabled(nextData.settings?.ai_enabled ?? false)
        setRgpdNotice(nextData.settings?.rgpd_notice ?? DEFAULT_RGPD_NOTICE)
        setLogoUrl(nextData.settings?.logo_url ?? '')
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
  }, [auth.loading, auth.profile])

  async function handleSave() {
    if (!data?.establishment) return
    const cleanName = name.trim()
    if (!cleanName) {
      setSaved(false)
      setError("Le nom ne peut pas etre vide.")
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)
    const input: UpdateSettingsInput = {
      name: cleanName,
      city: city.trim() || null,
      uai: uai.trim().toUpperCase() || null,
      school_year: schoolYear.trim() || null,
      teacher_load_threshold: threshold,
      ai_enabled: aiEnabled,
      rgpd_notice: rgpdNotice.trim() || null,
      logo_url: logoUrl.trim() || null,
    }
    try {
      const result = await updateTenantSettings(data.establishment.id, input)
      setData((current) =>
        current
          ? {
            ...current,
            establishment: result.establishment,
            settings: result.settings,
          }
          : current,
      )
      setName(result.establishment.name)
      setCity(result.establishment.city ?? '')
      setUai(result.establishment.uai ?? '')
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (auth.loading || loading) return <SettingsSkeleton />

  if (!auth.profile) {
    return (
      <BareSettingsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour modifier les parametres."
      />
    )
  }

  if (!['admin', 'ddfpt', 'superadmin'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Parametres etablissement" subtitle="Donnees Supabase">
        <EmptyState
          icon={<Shield className="w-5 h-5" />}
          title="Acces non autorise"
          description="Les parametres sont reserves aux administrateurs et DDFPT."
        />
      </AppLayout>
    )
  }

  if (error && !data) {
    return (
      <AppLayout title="Parametres etablissement" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les parametres"
          description={error}
        />
      </AppLayout>
    )
  }

  if (!data?.establishment) {
    return (
      <AppLayout title="Parametres etablissement" subtitle="Donnees Supabase">
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucun etablissement actif"
          description="Selectionnez ou creez un etablissement avant de configurer ses parametres."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Parametres etablissement"
      subtitle="Configuration generale et preferences IA - donnees Supabase"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<Building2 className="w-4 h-4" />}>Identite de l'etablissement</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
            </div>
            <div>
              <Label>UAI / RNE</Label>
              <Input
                value={uai}
                onChange={(e) => setUai(e.target.value.toUpperCase())}
                placeholder="0750000A"
                maxLength={8}
              />
            </div>
            <div>
              <Label>Annee scolaire</Label>
              <Input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
            </div>
          </CardBody>
        </Card>

        <TenantAccessCard establishment={data.establishment} className="lg:col-span-2" />

        <Card>
          <CardHeader>
            <CardTitle icon={<Shield className="w-4 h-4" />}>Charge professeur</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Seuil d'alerte (eleves par referent)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Une alerte est levee lorsqu'un professeur depasse ce nombre d'eleves affectes.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={<Sparkles className="w-4 h-4" />}>Preferences IA</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-sm">Activer l'assistant IA</span>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  L'IA reelle reste desactivee tant que l'Edge Function n'est pas branchee.
                </span>
              </span>
            </label>
            <div>
              <Label>URL logo</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={<FileText className="w-4 h-4" />}>Modeles de documents et RGPD</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <Label>Mention RGPD affichee aux tuteurs</Label>
              <Textarea value={rgpdNotice} onChange={(e) => setRgpdNotice(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {saved && <p className="text-sm text-emerald-700">Parametres enregistres.</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

function SettingsDemo() {
  const est = establishments.find((e) => e.id === ESTABLISHMENT_ID)!
  const [name, setName] = useState(est.name)
  const [city, setCity] = useState(est.city)
  const [year, setYear] = useState('2025-2026')
  const [threshold, setThreshold] = useState(6)
  const [aiEnabled, setAiEnabled] = useState(true)

  return (
    <AppLayout title="Parametres etablissement" subtitle="Configuration generale et preferences IA - mode demo">
      <RoleGuard allow={['admin', 'ddfpt']}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>Identite de l'etablissement</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>Annee scolaire</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div>
                <Label>UAI / RNE</Label>
                <Input defaultValue={est.uai || ''} placeholder="0691234A" />
              </div>
              <div className="md:col-span-2">
                <Button>Enregistrer</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<Shield className="w-4 h-4" />}>Charge professeur</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label>Seuil d'alerte (eleves par referent)</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<Sparkles className="w-4 h-4" />}>Preferences IA</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-sm">Activer l'assistant IA</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    Reformulation des comptes rendus, resumes et alertes intelligentes.
                  </span>
                </span>
              </label>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<FileText className="w-4 h-4" />}>Modeles de documents et RGPD</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <Label>Mention RGPD affichee aux tuteurs</Label>
                <Textarea defaultValue={DEFAULT_RGPD_NOTICE} />
              </div>
            </CardBody>
          </Card>
        </div>
      </RoleGuard>
    </AppLayout>
  )
}

function SettingsSkeleton() {
  return (
    <AppLayout title="Parametres etablissement" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-44 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BareSettingsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<Building2 className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
