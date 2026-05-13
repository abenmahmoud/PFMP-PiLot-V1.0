import { useEffect, useState } from 'react'
import { Mail, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label } from '@/components/ui/Field'
import type { TeacherCreateInput, TeacherWithStats } from '@/server/teachers.functions'

export type TeacherFormValues = TeacherCreateInput

interface TeacherFormModalProps {
  teacher?: TeacherWithStats | null
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: TeacherFormValues) => void
}

export function TeacherFormModal({
  teacher,
  submitting,
  error,
  onCancel,
  onSubmit,
}: TeacherFormModalProps) {
  const isEdit = Boolean(teacher)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [sendInvitation, setSendInvitation] = useState(!isEdit)

  useEffect(() => {
    setFirstName(teacher?.first_name ?? '')
    setLastName(teacher?.last_name ?? '')
    setEmail(teacher?.email ?? '')
    setPhone(teacher?.phone ?? '')
    setDiscipline(teacher?.discipline ?? '')
    setSendInvitation(!teacher)
  }, [teacher])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      firstName,
      lastName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      discipline: discipline.trim() || null,
      sendInvitation: !isEdit && Boolean(email.trim()) && sendInvitation,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle icon={<UserCog className="w-4 h-4" />}>
            {isEdit ? 'Modifier le professeur' : 'Ajouter un professeur'}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="teacher-first-name">Prenom</Label>
                <Input
                  id="teacher-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacher-last-name">Nom</Label>
                <Input
                  id="teacher-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="teacher-email">Email</Label>
              <Input
                id="teacher-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isEdit}
                placeholder="prenom.nom@ac-academie.fr"
              />
              <FieldHint>
                {isEdit
                  ? "Le changement d'email passe par la gestion utilisateurs."
                  : 'Optionnel : sans email, aucun compte de connexion ne sera cree.'}
              </FieldHint>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="teacher-phone">Telephone</Label>
                <Input
                  id="teacher-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="06..."
                />
              </div>
              <div>
                <Label htmlFor="teacher-discipline">Discipline</Label>
                <Input
                  id="teacher-discipline"
                  value={discipline}
                  onChange={(event) => setDiscipline(event.target.value)}
                  placeholder="Maintenance, Eco-gestion..."
                />
              </div>
            </div>

            {!isEdit && email.trim() && (
              <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={sendInvitation}
                  onChange={(event) => setSendInvitation(event.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
                    <Mail className="w-3.5 h-3.5" />
                    Envoyer une invitation de connexion
                  </span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    Le compte sera cree avec le role Referent PFMP. Les professeurs principaux se gerent via
                    Utilisateurs.
                  </span>
                </span>
              </label>
            )}

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

