import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { ClassRow, StageStatus, StudentRow } from '@/lib/database.types'
import type { CompanyWithTutors } from '@/server/companies.functions'
import type { CompanySuggestion } from '@/server/aiMatchmaking.functions'
import { suggestCompaniesForStudent } from '@/server/aiMatchmaking.functions'
import type { PlacementCreateInput } from '@/server/placements.functions'
import type { PfmpPeriodWithStats } from '@/server/pfmpPeriods.functions'
import type { TeacherWithStats } from '@/server/teachers.functions'
import { MatchmakingCard } from '@/components/ai/MatchmakingCard'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'

export interface PlacementFormValues {
  studentId: string
  periodId: string
  companyId: string | null
  tutorId: string | null
  referentId: string | null
  startDate: string | null
  endDate: string | null
  status: StageStatus
  notes: string | null
}

export function PlacementFormModal({
  open,
  accessToken,
  establishmentId,
  students,
  classes,
  periods,
  companies,
  teachers,
  initial,
  lockStudentPeriod = false,
  submitLabel = 'Creer le dossier PFMP',
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  accessToken: string
  establishmentId: string | null
  students: StudentRow[]
  classes: ClassRow[]
  periods: PfmpPeriodWithStats[]
  companies: CompanyWithTutors[]
  teachers: TeacherWithStats[]
  initial?: Partial<PlacementFormValues>
  lockStudentPeriod?: boolean
  submitLabel?: string
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: PlacementFormValues) => Promise<void> | void
}) {
  const [values, setValues] = useState<PlacementFormValues>(() =>
    buildInitialValues(students, periods, initial),
  )
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const selectedCompany = companies.find((item) => item.company.id === values.companyId) ?? null
  const availableTutors = selectedCompany?.tutors.filter((tutor) => !tutor.archived_at) ?? []
  const studentClass = useMemo(() => {
    const student = students.find((item) => item.id === values.studentId)
    return student?.class_id ? classes.find((klass) => klass.id === student.class_id) ?? null : null
  }, [classes, students, values.studentId])

  useEffect(() => {
    if (!open) return
    setValues(buildInitialValues(students, periods, initial))
    setSuggestions([])
    setSuggestError(null)
  }, [
    open,
    students[0]?.id,
    periods[0]?.period.id,
    initial?.studentId,
    initial?.periodId,
    initial?.companyId,
    initial?.tutorId,
    initial?.referentId,
    initial?.startDate,
    initial?.endDate,
    initial?.status,
    initial?.notes,
  ])

  if (!open) return null

  function patch<K extends keyof PlacementFormValues>(key: K, value: PlacementFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function runSuggestions() {
    if (!values.studentId || !accessToken) return
    setSuggestLoading(true)
    setSuggestError(null)
    try {
      const result = await suggestCompaniesForStudent({
        data: {
          accessToken,
          establishmentId,
          studentId: values.studentId,
        },
      })
      setSuggestions(result.suggestions)
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : String(err))
    } finally {
      setSuggestLoading(false)
    }
  }

  function selectSuggestion(suggestion: CompanySuggestion) {
    const company = companies.find((item) => item.company.id === suggestion.company.id)
    setValues((current) => ({
      ...current,
      companyId: suggestion.company.id,
      tutorId: company?.tutors.find((tutor) => !tutor.archived_at)?.id ?? null,
      status: current.status === 'no_stage' || current.status === 'draft' ? 'found' : current.status,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <form
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-[var(--color-border)]"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(values)
        }}
      >
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Dossier PFMP eleve</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Ouvrez le dossier PFMP de l eleve. L entreprise, les dates, le tuteur et le referent peuvent etre ajoutes plus tard.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {error && (
            <div className="lg:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <section className="space-y-4">
            <div>
              <Label>Eleve</Label>
              <Select
                value={values.studentId}
                onChange={(event) => {
                  patch('studentId', event.target.value)
                  setSuggestions([])
                }}
                required
                disabled={lockStudentPeriod}
              >
                <option value="">Selectionner</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.last_name} {student.first_name}
                  </option>
                ))}
              </Select>
              {studentClass && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Classe : {studentClass.name}</p>
              )}
            </div>
            <div>
              <Label>Periode</Label>
              <Select value={values.periodId} onChange={(event) => patch('periodId', event.target.value)} required disabled={lockStudentPeriod}>
                <option value="">Selectionner</option>
                {periods.map((period) => (
                  <option key={period.period.id} value={period.period.id}>
                    {period.period.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Date debut</Label>
                <Input type="date" value={values.startDate ?? ''} onChange={(event) => patch('startDate', event.target.value || null)} />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input type="date" value={values.endDate ?? ''} onChange={(event) => patch('endDate', event.target.value || null)} />
              </div>
            </div>

            <div>
              <Label>Statut</Label>
              <Select value={values.status} onChange={(event) => patch('status', event.target.value as StageStatus)}>
                <option value="no_stage">Recherche stage</option>
                <option value="found">Entreprise proposee</option>
                <option value="confirmed">Valide DDFPT</option>
                <option value="pending_convention">Convention a signer</option>
                <option value="signed_convention">Convention signee</option>
                <option value="in_progress">En stage</option>
                <option value="completed">Termine</option>
                <option value="cancelled">Annule</option>
              </Select>
            </div>

            <div>
              <Label>Referent PFMP</Label>
              <Select value={values.referentId ?? ''} onChange={(event) => patch('referentId', event.target.value || null)}>
                <option value="">Aucun</option>
                {teachers
                  .filter((teacher) => !teacher.archived_at && teacher.profile_id)
                  .map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-brand-700)]">AI Matchmaking</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Suggestions explicables selon formation, fiabilite et historique.
                  </p>
                </div>
                <Button type="button" size="sm" variant="subtle" iconLeft={<Sparkles className="w-4 h-4" />} onClick={runSuggestions} disabled={suggestLoading || !values.studentId}>
                  {suggestLoading ? 'Analyse...' : 'Suggestions IA'}
                </Button>
              </div>
              {suggestError && <p className="mt-2 text-xs text-red-700">{suggestError}</p>}
            </div>

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {suggestions.map((suggestion) => (
                  <MatchmakingCard key={suggestion.company.id} suggestion={suggestion} onSelect={selectSuggestion} />
                ))}
              </div>
            )}

            <div>
              <Label>Entreprise</Label>
              <Select
                value={values.companyId ?? ''}
                onChange={(event) => {
                  const companyId = event.target.value || null
                  setValues((current) => ({
                    ...current,
                    companyId,
                    tutorId: null,
                    status: companyId && (current.status === 'no_stage' || current.status === 'draft')
                      ? 'found'
                      : current.status,
                  }))
                }}
              >
                <option value="">Aucune</option>
                {companies.map((item) => (
                  <option key={item.company.id} value={item.company.id}>
                    {item.company.name} {item.company.city ? `- ${item.company.city}` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Tuteur entreprise</Label>
              <Select value={values.tutorId ?? ''} onChange={(event) => patch('tutorId', event.target.value || null)} disabled={!values.companyId}>
                <option value="">Aucun</option>
                {availableTutors.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.first_name} {tutor.last_name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={values.notes ?? ''} onChange={(event) => patch('notes', event.target.value || null)} />
            </div>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || !values.studentId || !values.periodId}>
            {submitting ? 'Enregistrement...' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function placementValuesToCreateInput(values: PlacementFormValues, establishmentId: string | null): PlacementCreateInput {
  return {
    establishmentId,
    studentId: values.studentId,
    periodId: values.periodId,
    companyId: values.companyId,
    tutorId: values.tutorId,
    referentId: values.referentId,
    startDate: values.startDate,
    endDate: values.endDate,
    status: values.status,
    notes: values.notes,
  }
}

function buildInitialValues(
  students: StudentRow[],
  periods: PfmpPeriodWithStats[],
  initial?: Partial<PlacementFormValues>,
): PlacementFormValues {
  return {
    studentId: initial?.studentId ?? students[0]?.id ?? '',
    periodId: initial?.periodId ?? periods[0]?.period.id ?? '',
    companyId: initial?.companyId ?? null,
    tutorId: initial?.tutorId ?? null,
    referentId: initial?.referentId ?? null,
    startDate: initial?.startDate ?? periods[0]?.period.start_date ?? null,
    endDate: initial?.endDate ?? periods[0]?.period.end_date ?? null,
    status: initial?.status ?? 'no_stage',
    notes: initial?.notes ?? null,
  }
}
