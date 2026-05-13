import { useState } from 'react'
import type { ClassRow, PeriodStatus } from '@/lib/database.types'
import type { PfmpPeriodCreateInput, PfmpPeriodType } from '@/server/pfmpPeriods.functions'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'

export interface PeriodFormValues {
  classId: string | null
  name: string
  type: PfmpPeriodType
  startDate: string
  endDate: string
  schoolYear: string
  status: PeriodStatus
  notes: string | null
}

const PERIOD_TYPES: Array<{ value: PfmpPeriodType; label: string }> = [
  { value: 'pfmp_1', label: 'PFMP 1' },
  { value: 'pfmp_2', label: 'PFMP 2' },
  { value: 'pfmp_3', label: 'PFMP 3' },
  { value: 'stage_decouverte', label: 'Stage decouverte' },
  { value: 'autre', label: 'Autre' },
]

export function PeriodFormModal({
  open,
  classes,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  classes: ClassRow[]
  initial?: Partial<PeriodFormValues>
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: PeriodFormValues) => Promise<void> | void
}) {
  const [values, setValues] = useState<PeriodFormValues>(() => ({
    classId: initial?.classId ?? null,
    name: initial?.name ?? '',
    type: initial?.type ?? 'pfmp_1',
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
    schoolYear: initial?.schoolYear ?? currentSchoolYear(),
    status: initial?.status ?? 'draft',
    notes: initial?.notes ?? null,
  }))

  if (!open) return null

  function patch<K extends keyof PeriodFormValues>(key: K, value: PeriodFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <form
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-[var(--color-border)]"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(values)
        }}
      >
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Periode PFMP</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Calendrier d'une classe et suivi des placements.</p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Nom</Label>
            <Input value={values.name} onChange={(event) => patch('name', event.target.value)} required />
          </div>
          <div>
            <Label>Classe</Label>
            <Select value={values.classId ?? ''} onChange={(event) => patch('classId', event.target.value || null)}>
              <option value="">Aucune classe</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={values.type} onChange={(event) => patch('type', event.target.value as PfmpPeriodType)}>
              {PERIOD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Date debut</Label>
            <Input type="date" value={values.startDate} onChange={(event) => patch('startDate', event.target.value)} required />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={values.endDate} onChange={(event) => patch('endDate', event.target.value)} required />
          </div>
          <div>
            <Label>Annee scolaire</Label>
            <Input value={values.schoolYear} onChange={(event) => patch('schoolYear', event.target.value)} required />
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={values.status} onChange={(event) => patch('status', event.target.value as PeriodStatus)}>
              <option value="draft">Brouillon</option>
              <option value="published">Publiee</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminee</option>
              <option value="cancelled">Annulee</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={values.notes ?? ''} onChange={(event) => patch('notes', event.target.value || null)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function periodValuesToCreateInput(values: PeriodFormValues, establishmentId: string | null): PfmpPeriodCreateInput {
  return {
    establishmentId,
    classId: values.classId,
    name: values.name,
    type: values.type,
    startDate: values.startDate,
    endDate: values.endDate,
    schoolYear: values.schoolYear,
    status: values.status,
    notes: values.notes,
  }
}

function currentSchoolYear(): string {
  const now = new Date()
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}
