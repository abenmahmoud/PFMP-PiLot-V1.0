import { useState } from 'react'
import { Sparkles, Save, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input, Label, Select, Textarea } from './ui/Field'
import { AiSuggestionBox } from './AiAssistantPanel'
import {
  type AlertLevel,
  type ContactType,
  ALERT_LEVEL_LABELS,
  CONTACT_TYPE_LABELS,
} from '@/types'
import { generateAiResponse, logAiInteraction } from '@/ai/aiService'
import type { AiResponse } from '@/ai/aiTypes'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { students } from '@/data/demo'

interface VisitFormProps {
  studentId?: string
  onSubmit?: (data: VisitFormData) => void
}

export interface VisitFormData {
  studentId: string
  date: string
  contactType: ContactType
  studentPresent: boolean
  tutorMet: boolean
  conditions: string
  activities: string
  professionalPosture: string
  positives: string
  difficulties: string
  tutorRemark: string
  teacherRemark: string
  alertLevel: AlertLevel
  nextAction: string
  status: 'draft' | 'validated'
}

export function VisitForm({ studentId, onSubmit }: VisitFormProps) {
  const me = useCurrentUser()
  const [data, setData] = useState<VisitFormData>({
    studentId: studentId || '',
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
    status: 'draft',
  })

  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AiResponse | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function update<K extends keyof VisitFormData>(key: K, value: VisitFormData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function askAi() {
    setAiLoading(true)
    setAiOpen(true)
    const notes = [
      data.conditions,
      data.activities,
      data.professionalPosture,
      data.positives,
      data.difficulties,
      data.tutorRemark,
    ]
      .filter(Boolean)
      .join('\n')
    const res = await generateAiResponse({
      assistantType: 'teacher',
      prompt: notes || data.teacherRemark,
    })
    await logAiInteraction({
      assistantType: 'teacher',
      userId: me.id,
      establishmentId: me.establishmentId,
      inputSummary: notes.slice(0, 120),
      outputSummary: res.draft.slice(0, 120),
      relatedEntityType: 'visit',
      relatedEntityId: data.studentId,
    })
    setAiResponse(res)
    setAiLoading(false)
  }

  function handleSave(status: 'draft' | 'validated') {
    const payload = { ...data, status }
    onSubmit?.(payload)
    setSavedAt(new Date().toLocaleTimeString('fr-FR'))
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Identité de la visite</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vf-student">Élève</Label>
            <Select
              id="vf-student"
              value={data.studentId}
              onChange={(e) => update('studentId', e.target.value)}
            >
              <option value="">— Choisir un élève —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vf-date">Date</Label>
            <Input
              id="vf-date"
              type="date"
              value={data.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vf-type">Type de contact</Label>
            <Select
              id="vf-type"
              value={data.contactType}
              onChange={(e) => update('contactType', e.target.value as ContactType)}
            >
              {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((k) => (
                <option key={k} value={k}>
                  {CONTACT_TYPE_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ToggleField
              label="Élève présent"
              value={data.studentPresent}
              onChange={(v) => update('studentPresent', v)}
            />
            <ToggleField
              label="Tuteur rencontré"
              value={data.tutorMet}
              onChange={(v) => update('tutorMet', v)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observations terrain</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label="Conditions de stage"
            value={data.conditions}
            onChange={(v) => update('conditions', v)}
            placeholder="Atelier, équipement, accueil…"
          />
          <Field
            label="Activités réalisées"
            value={data.activities}
            onChange={(v) => update('activities', v)}
            placeholder="Tâches confiées, niveau d'autonomie…"
          />
          <Field
            label="Posture professionnelle"
            value={data.professionalPosture}
            onChange={(v) => update('professionalPosture', v)}
            placeholder="Ponctualité, savoir-être, relations…"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Points positifs"
              value={data.positives}
              onChange={(v) => update('positives', v)}
            />
            <Field
              label="Difficultés"
              value={data.difficulties}
              onChange={(v) => update('difficulties', v)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Remarque tuteur"
              value={data.tutorRemark}
              onChange={(v) => update('tutorRemark', v)}
            />
            <Field
              label="Remarque professeur"
              value={data.teacherRemark}
              onChange={(v) => update('teacherRemark', v)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Niveau d'alerte et suivi</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vf-alert">Niveau d'alerte</Label>
            <Select
              id="vf-alert"
              value={data.alertLevel}
              onChange={(e) => update('alertLevel', e.target.value as AlertLevel)}
            >
              {(Object.keys(ALERT_LEVEL_LABELS) as AlertLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ALERT_LEVEL_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vf-next">Prochaine action</Label>
            <Input
              id="vf-next"
              value={data.nextAction}
              onChange={(e) => update('nextAction', e.target.value)}
              placeholder="Ex. : appel tuteur sous 7 jours"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={<Sparkles className="w-4 h-4" />}>Aide IA à la rédaction</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            L'IA reformule vos notes brutes en un compte rendu professionnel. Elle n'invente
            jamais et ne valide jamais. Vous gardez la main sur le texte final.
          </p>
          <Button
            type="button"
            variant="subtle"
            onClick={askAi}
            disabled={aiLoading}
            iconLeft={
              aiLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )
            }
          >
            Aider à reformuler avec l'IA
          </Button>
          {aiOpen && aiResponse && (
            <AiSuggestionBox
              className="mt-4"
              response={aiResponse}
              onAccept={() => {
                update('teacherRemark', aiResponse.draft)
                setAiOpen(false)
              }}
              onReject={() => setAiOpen(false)}
            />
          )}
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          {savedAt ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success-fg)]" />
              Enregistré à {savedAt}
            </span>
          ) : (
            'Le compte rendu reste en brouillon tant que vous ne le validez pas.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            iconLeft={<Save className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
          >
            Brouillon
          </Button>
          <Button
            iconLeft={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => handleSave('validated')}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 h-9 rounded-lg border text-sm font-medium ${
            value
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
            !value
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
