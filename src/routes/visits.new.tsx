import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, Save } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  createVisit,
  fetchVisitFormOptions,
  type VisitFormOptions,
} from '@/services/visits'
import type { AlertLevel, ContactType } from '@/lib/database.types'
import { ALERT_LEVEL_LABELS, CONTACT_TYPE_LABELS } from '@/types'
import { VisitForm } from '@/components/VisitForm'

export const Route = createFileRoute('/visits/new')({ component: NewVisitPage })

const LOAD_TIMEOUT_MS = 12000

interface VisitDraft {
  studentId: string
  teacherId: string
  periodId: string
  date: string
  contactType: ContactType
  studentPresent: boolean | null
  tutorMet: boolean | null
  conditions: string
  activities: string
  professionalPosture: string
  positives: string
  difficulties: string
  tutorRemark: string
  teacherRemark: string
  alertLevel: AlertLevel
  nextAction: string
}

function NewVisitPage() {
  if (isDemoMode()) return <NewVisitDemo />
  return <NewVisitSupabase />
}

function NewVisitSupabase() {
  const auth = useAuth()
  const navigate = useNavigate()
  const initialStudentId =
    typeof window === 'undefined'
      ? undefined
      : new URLSearchParams(window.location.search).get('studentId') ?? undefined
  const [options, setOptions] = useState<VisitFormOptions | null>(null)
  const [draft, setDraft] = useState<VisitDraft>(() => ({
    studentId: initialStudentId ?? '',
    teacherId: '',
    periodId: '',
    date: new Date().toISOString().slice(0, 10),
    contactType: 'visit',
    studentPresent: true,
    tutorMet: true,
    conditions: '',
    activities: '',
    professionalPosture: '',
    positives: '',
    difficulties: '',
    tutorRemark: '',
    teacherRemark: '',
    alertLevel: 'none',
    nextAction: '',
  }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

    withTimeout(fetchVisitFormOptions(auth.profile), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextOptions) => {
        if (!mounted) return
        setOptions(nextOptions)
        setDraft((current) => ({
          ...current,
          teacherId:
            current.teacherId ||
            nextOptions.currentTeacher?.id ||
            nextOptions.teachers[0]?.id ||
            '',
          periodId: current.periodId || nextOptions.periods[0]?.id || '',
          studentId: current.studentId || nextOptions.students[0]?.id || '',
        }))
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

  const selectedStudent = useMemo(
    () => options?.students.find((student) => student.id === draft.studentId) ?? null,
    [draft.studentId, options],
  )

  function update<K extends keyof VisitDraft>(key: K, value: VisitDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    if (!auth.profile) return
    if (!auth.profile.establishment_id) {
      setError("Aucun etablissement actif pour creer la visite.")
      return
    }
    if (!draft.studentId || !draft.teacherId || !draft.date) {
      setError("Eleve, professeur referent et date sont obligatoires.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const visit = await createVisit({
        establishmentId: auth.profile.establishment_id,
        studentId: draft.studentId,
        teacherId: draft.teacherId,
        periodId: draft.periodId || null,
        date: draft.date,
        contactType: draft.contactType,
        studentPresent: draft.studentPresent,
        tutorMet: draft.tutorMet,
        conditions: nullable(draft.conditions),
        activities: nullable(draft.activities),
        professionalPosture: nullable(draft.professionalPosture),
        positives: nullable(draft.positives),
        difficulties: nullable(draft.difficulties),
        tutorRemark: nullable(draft.tutorRemark),
        teacherRemark: nullable(draft.teacherRemark),
        alertLevel: draft.alertLevel,
        nextAction: nullable(draft.nextAction),
      })
      navigate({ to: '/visits/$id', params: { id: visit.id } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (auth.loading || loading) return <VisitSkeleton />

  if (!auth.profile) {
    return (
      <BareVisitState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour creer une visite."
      />
    )
  }

  if (!['referent', 'principal', 'ddfpt', 'admin', 'superadmin'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Nouvelle visite" subtitle="Donnees Supabase">
        <EmptyState
          title="Acces non autorise"
          description="La creation de visite est reservee aux referents et aux roles de pilotage."
        />
      </AppLayout>
    )
  }

  if (error && !options) {
    return (
      <AppLayout title="Nouvelle visite" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de preparer la visite"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Nouvelle visite"
      subtitle="Mobile-first - saisie terrain - donnees Supabase"
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Identite de la visite</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit-student">Eleve</Label>
              <Select
                id="visit-student"
                value={draft.studentId}
                onChange={(e) => update('studentId', e.target.value)}
              >
                <option value="">Choisir un eleve</option>
                {options?.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                    {student.className ? ` - ${student.className}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visit-date">Date</Label>
              <Input
                id="visit-date"
                type="date"
                value={draft.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="visit-teacher">Professeur referent</Label>
              <Select
                id="visit-teacher"
                value={draft.teacherId}
                onChange={(e) => update('teacherId', e.target.value)}
              >
                <option value="">Choisir un professeur</option>
                {options?.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visit-period">Periode PFMP</Label>
              <Select
                id="visit-period"
                value={draft.periodId}
                onChange={(e) => update('periodId', e.target.value)}
              >
                <option value="">Aucune periode</option>
                {options?.periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visit-contact">Type de contact</Label>
              <Select
                id="visit-contact"
                value={draft.contactType}
                onChange={(e) => update('contactType', e.target.value as ContactType)}
              >
                {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((value) => (
                  <option key={value} value={value}>
                    {CONTACT_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ToggleField
                label="Eleve present"
                value={draft.studentPresent}
                onChange={(value) => update('studentPresent', value)}
              />
              <ToggleField
                label="Tuteur rencontre"
                value={draft.tutorMet}
                onChange={(value) => update('tutorMet', value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observations terrain</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Conditions de stage" value={draft.conditions} onChange={(value) => update('conditions', value)} />
            <Field label="Activites realisees" value={draft.activities} onChange={(value) => update('activities', value)} />
            <Field label="Posture professionnelle" value={draft.professionalPosture} onChange={(value) => update('professionalPosture', value)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Points positifs" value={draft.positives} onChange={(value) => update('positives', value)} />
              <Field label="Difficultes" value={draft.difficulties} onChange={(value) => update('difficulties', value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Remarque tuteur" value={draft.tutorRemark} onChange={(value) => update('tutorRemark', value)} />
              <Field label="Remarque professeur" value={draft.teacherRemark} onChange={(value) => update('teacherRemark', value)} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Niveau d'alerte et suivi</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit-alert">Niveau d'alerte</Label>
              <Select
                id="visit-alert"
                value={draft.alertLevel}
                onChange={(e) => update('alertLevel', e.target.value as AlertLevel)}
              >
                {(Object.keys(ALERT_LEVEL_LABELS) as AlertLevel[]).map((value) => (
                  <option key={value} value={value}>
                    {ALERT_LEVEL_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visit-next">Prochaine action</Label>
              <Input
                id="visit-next"
                value={draft.nextAction}
                onChange={(e) => update('nextAction', e.target.value)}
                placeholder="Ex. : appel tuteur sous 7 jours"
              />
            </div>
          </CardBody>
        </Card>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-[var(--color-border)] flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            {selectedStudent
              ? `Brouillon pour ${selectedStudent.firstName} ${selectedStudent.lastName}.`
              : 'Choisissez un eleve avant d’enregistrer.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              iconLeft={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving}
            >
              Brouillon
            </Button>
            <Button iconLeft={<CheckCircle2 className="w-4 h-4" />} disabled>
              Valider
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function NewVisitDemo() {
  return (
    <AppLayout
      title="Nouvelle visite"
      subtitle="Mobile-first - saisissez vos notes pendant la visite, l'IA peut les reformuler - mode demo"
    >
      <RoleGuard allow={['referent', 'principal', 'ddfpt', 'admin']}>
        <VisitForm />
      </RoleGuard>
    </AppLayout>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 h-9 rounded-lg border text-sm font-medium ${
            value === true
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]'
              : 'border-[var(--color-border-strong)] text-[var(--color-text-muted)]'
          }`}
        >
          Oui
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 h-9 rounded-lg border text-sm font-medium ${
            value === false
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]'
              : 'border-[var(--color-border-strong)] text-[var(--color-text-muted)]'
          }`}
        >
          Non
        </button>
      </div>
    </div>
  )
}

function VisitSkeleton() {
  return (
    <AppLayout title="Nouvelle visite" subtitle="Lecture des donnees Supabase...">
      <div className="space-y-4 max-w-3xl mx-auto">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-48 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BareVisitState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState title={title} description={description} />
      </div>
    </main>
  )
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
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
