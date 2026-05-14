import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { useAuth } from '@/lib/AuthProvider'
import type { SignerRole } from '@/lib/database.types'
import { requestSignaturesForDocument, type SignatureSignerInput, type SignatureStatusResult } from '@/server/signatures.functions'

interface RequestSignaturesModalProps {
  generatedDocumentId: string
  onClose: () => void
  onRequested: (status: SignatureStatusResult) => void
}

const DEFAULT_ROWS: SignatureSignerInput[] = [
  { role: 'tutor', name: '', email: '', phone: null, userId: null, tutorId: null, studentId: null, required: true },
  { role: 'referent', name: '', email: '', phone: null, userId: null, tutorId: null, studentId: null, required: true },
  { role: 'admin', name: '', email: '', phone: null, userId: null, tutorId: null, studentId: null, required: true },
]

const ROLE_OPTIONS: Array<{ value: SignerRole; label: string }> = [
  { value: 'student', label: 'Eleve' },
  { value: 'tutor', label: 'Tuteur entreprise' },
  { value: 'referent', label: 'Referent PFMP' },
  { value: 'admin', label: 'Administration' },
  { value: 'parent', label: 'Parent' },
]

export function RequestSignaturesModal({ generatedDocumentId, onClose, onRequested }: RequestSignaturesModalProps) {
  const auth = useAuth()
  const [rows, setRows] = useState<SignatureSignerInput[]>(DEFAULT_ROWS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(index: number, patch: Partial<SignatureSignerInput>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((current) => [...current, { role: 'tutor', name: '', email: '', phone: null, userId: null, tutorId: null, studentId: null, required: true }])
  }

  async function submit() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const signers = rows.filter((row) => row.name.trim() && row.email.trim())
    if (signers.length === 0) {
      setError('Ajoutez au moins un signataire avec nom et email.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const status = await requestSignaturesForDocument({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          generatedDocumentId,
          signers,
        },
      })
      onRequested(status)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">Demander les signatures</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Signature electronique simple avec lien securise pour les signataires sans compte.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-3">
                <div>
                  <Label>Role</Label>
                  <Select value={row.role} onChange={(event) => update(index, { role: event.target.value as SignerRole })}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={row.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Nom complet" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={row.email} onChange={(event) => update(index, { email: event.target.value })} placeholder="email@example.fr" />
                </div>
              </div>
            ))}
          </div>
          <Button type="button" className="mt-4" size="sm" variant="secondary" onClick={addRow}>
            Ajouter un signataire
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" iconLeft={<Send className="w-4 h-4" />} onClick={submit} disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer les demandes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
