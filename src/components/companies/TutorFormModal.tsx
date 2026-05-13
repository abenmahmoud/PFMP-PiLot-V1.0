import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { TUTOR_RESPONSIVENESS_LABELS, type TutorResponsiveness } from '@/types'
import type { TutorCreateInput } from '@/server/companies.functions'
import type { TutorRow } from '@/lib/database.types'

export type TutorFormValues = TutorCreateInput

interface TutorFormModalProps {
  tutor?: TutorRow | null
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: TutorFormValues) => void
}

const RESPONSIVENESSES = Object.keys(TUTOR_RESPONSIVENESS_LABELS) as TutorResponsiveness[]

export function TutorFormModal({
  tutor,
  submitting,
  error,
  onCancel,
  onSubmit,
}: TutorFormModalProps) {
  const isEdit = Boolean(tutor)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fonction, setFonction] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [responsiveness, setResponsiveness] = useState<TutorResponsiveness>('unknown')
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    setFirstName(tutor?.first_name ?? '')
    setLastName(tutor?.last_name ?? '')
    setFonction(tutor?.function ?? '')
    setEmail(tutor?.email ?? '')
    setPhone(tutor?.phone ?? '')
    setResponsiveness((tutor?.responsiveness as TutorResponsiveness | null) ?? 'unknown')
    setInternalNotes(tutor?.internal_notes ?? '')
  }, [tutor])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      firstName,
      lastName,
      function: fonction.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      responsiveness,
      internalNotes: internalNotes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle icon={<UserRound className="h-4 w-4" />}>
            {isEdit ? 'Modifier le tuteur' : 'Ajouter un tuteur'}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="tutor-first-name">Prenom</Label>
                <Input id="tutor-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="tutor-last-name">Nom</Label>
                <Input id="tutor-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="tutor-function">Fonction</Label>
                <Input id="tutor-function" value={fonction} onChange={(event) => setFonction(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="tutor-responsiveness">Reactivite</Label>
                <Select
                  id="tutor-responsiveness"
                  value={responsiveness}
                  onChange={(event) => setResponsiveness(event.target.value as TutorResponsiveness)}
                >
                  {RESPONSIVENESSES.map((item) => (
                    <option key={item} value={item}>
                      {TUTOR_RESPONSIVENESS_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="tutor-email">Email</Label>
                <Input id="tutor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="tutor-phone">Telephone</Label>
                <Input id="tutor-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="tutor-notes">Notes internes</Label>
              <Textarea id="tutor-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
            </div>

            {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
