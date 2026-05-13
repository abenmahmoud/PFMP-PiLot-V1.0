import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import type { VisitEvaluationLevel, VisitEvaluationRow } from '@/lib/database.types'

const LEVELS: Array<{ value: VisitEvaluationLevel; label: string }> = [
  { value: 'non_evalue', label: 'Non evalue' },
  { value: 'A', label: 'A - acquis' },
  { value: 'B', label: 'B - en cours' },
  { value: 'C', label: 'C - non acquis' },
  { value: 'NE', label: 'Non evaluable' },
]

export function CompetenceEvaluationGrid({
  evaluations,
  onAdd,
  disabled,
}: {
  evaluations: VisitEvaluationRow[]
  onAdd: (input: { competenceCode: string; competenceLabel: string; level: VisitEvaluationLevel; notes: string | null }) => Promise<void>
  disabled?: boolean
}) {
  const [competenceCode, setCompetenceCode] = useState('')
  const [competenceLabel, setCompetenceLabel] = useState('')
  const [level, setLevel] = useState<VisitEvaluationLevel>('non_evalue')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!competenceCode.trim() || !competenceLabel.trim()) return
    setSaving(true)
    try {
      await onAdd({ competenceCode, competenceLabel, level, notes: notes.trim() || null })
      setCompetenceCode('')
      setCompetenceLabel('')
      setNotes('')
      setLevel('non_evalue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {evaluations.length > 0 && (
        <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="grid grid-cols-1 gap-1 px-3 py-2 text-sm sm:grid-cols-[120px_1fr_120px]">
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{evaluation.competence_code}</span>
              <span>{evaluation.competence_label}</span>
              <span className="font-medium">{evaluation.level}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Code competence</Label>
          <Input value={competenceCode} onChange={(event) => setCompetenceCode(event.target.value)} placeholder="MSPC.C1.1" disabled={disabled} />
        </div>
        <div>
          <Label>Niveau</Label>
          <Select value={level} onChange={(event) => setLevel(event.target.value as VisitEvaluationLevel)} disabled={disabled}>
            {LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Libelle</Label>
          <Input value={competenceLabel} onChange={(event) => setCompetenceLabel(event.target.value)} placeholder="Diagnostiquer une panne..." disabled={disabled} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={disabled} />
        </div>
      </div>
      <Button type="button" size="sm" onClick={submit} disabled={disabled || saving || !competenceCode.trim() || !competenceLabel.trim()}>
        {saving ? 'Ajout...' : 'Ajouter evaluation'}
      </Button>
    </div>
  )
}
