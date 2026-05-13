import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { FieldHint, Input, Label, Select, Textarea } from '@/components/ui/Field'
import {
  COMPANY_RELIABILITY_LABELS,
  COMPANY_STATUS_LABELS,
  PROFESSIONAL_FAMILY_LABELS,
  type CompanyReliability,
  type CompanyStatus,
  type ProfessionalFamily,
} from '@/types'
import type { CompanyCreateInput } from '@/server/companies.functions'
import type { CompanyRow } from '@/lib/database.types'

export type CompanyFormValues = CompanyCreateInput

interface CompanyFormModalProps {
  company?: CompanyRow | null
  establishmentId?: string | null
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: CompanyFormValues) => void
}

const PROFESSIONAL_FAMILIES = Object.keys(PROFESSIONAL_FAMILY_LABELS) as ProfessionalFamily[]
const COMPANY_STATUSES = Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[]
const COMPANY_RELIABILITIES = Object.keys(COMPANY_RELIABILITY_LABELS) as CompanyReliability[]

export function CompanyFormModal({
  company,
  establishmentId,
  submitting,
  error,
  onCancel,
  onSubmit,
}: CompanyFormModalProps) {
  const isEdit = Boolean(company)
  const [name, setName] = useState('')
  const [siret, setSiret] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [sector, setSector] = useState('')
  const [professionalFamily, setProfessionalFamily] = useState<ProfessionalFamily | ''>('')
  const [compatibleFormations, setCompatibleFormations] = useState('')
  const [reliability, setReliability] = useState<CompanyReliability>('unknown')
  const [status, setStatus] = useState<CompanyStatus>('active')
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    setName(company?.name ?? '')
    setSiret(company?.siret ?? '')
    setAddress(company?.address ?? '')
    setZipCode(company?.zip_code ?? '')
    setCity(company?.city ?? '')
    setPhone(company?.phone ?? '')
    setEmail(company?.email ?? '')
    setWebsite(company?.website ?? '')
    setSector(company?.sector ?? '')
    setProfessionalFamily((company?.professional_family as ProfessionalFamily | null) ?? '')
    setCompatibleFormations((company?.compatible_formations ?? []).join(', '))
    setReliability((company?.reliability as CompanyReliability | null) ?? 'unknown')
    setStatus((company?.status as CompanyStatus | null) ?? 'active')
    setInternalNotes(company?.internal_notes ?? '')
  }, [company])

  const siretValid = useMemo(() => {
    const value = siret.replace(/\s/g, '')
    return value.length === 0 || /^\d{14}$/.test(value)
  }, [siret])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!siretValid) return
    onSubmit({
      establishmentId,
      name,
      siret: siret.replace(/\s/g, '') || null,
      address: address.trim() || null,
      zipCode: zipCode.trim() || null,
      city: city.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      sector: sector.trim() || null,
      professionalFamily: professionalFamily || null,
      compatibleFormations: compatibleFormations
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      reliability,
      status,
      internalNotes: internalNotes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader>
          <CardTitle icon={<Building2 className="h-4 w-4" />}>
            {isEdit ? "Modifier l'entreprise" : 'Ajouter une entreprise'}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.8fr]">
              <div>
                <Label htmlFor="company-name">Nom de l'entreprise</Label>
                <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="company-siret">SIRET</Label>
                <Input
                  id="company-siret"
                  value={siret}
                  onChange={(event) => setSiret(event.target.value)}
                  inputMode="numeric"
                  placeholder="14 chiffres"
                  className={siretValid ? undefined : 'border-red-400'}
                />
                <FieldHint className={siretValid ? undefined : 'text-red-700'}>Optionnel, 14 chiffres.</FieldHint>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.5fr_0.8fr]">
              <div>
                <Label htmlFor="company-address">Adresse</Label>
                <Input id="company-address" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="company-zip">Code postal</Label>
                <Input id="company-zip" value={zipCode} onChange={(event) => setZipCode(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="company-city">Ville</Label>
                <Input id="company-city" value={city} onChange={(event) => setCity(event.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="company-phone">Telephone</Label>
                <Input id="company-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="company-email">Email</Label>
                <Input id="company-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="company-website">Site web</Label>
                <Input id="company-website" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <Label htmlFor="company-sector">Secteur</Label>
                <Input id="company-sector" value={sector} onChange={(event) => setSector(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="company-family">Famille metier</Label>
                <Select
                  id="company-family"
                  value={professionalFamily}
                  onChange={(event) => setProfessionalFamily(event.target.value as ProfessionalFamily | '')}
                >
                  <option value="">Non renseignee</option>
                  {PROFESSIONAL_FAMILIES.map((family) => (
                    <option key={family} value={family}>
                      {PROFESSIONAL_FAMILY_LABELS[family]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="company-status">Statut</Label>
                <Select id="company-status" value={status} onChange={(event) => setStatus(event.target.value as CompanyStatus)}>
                  {COMPANY_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {COMPANY_STATUS_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="company-reliability">Fiabilite</Label>
                <Select
                  id="company-reliability"
                  value={reliability}
                  onChange={(event) => setReliability(event.target.value as CompanyReliability)}
                >
                  {COMPANY_RELIABILITIES.map((item) => (
                    <option key={item} value={item}>
                      {COMPANY_RELIABILITY_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="company-formations">Formations compatibles</Label>
              <Input
                id="company-formations"
                value={compatibleFormations}
                onChange={(event) => setCompatibleFormations(event.target.value)}
                placeholder="CAP EPC, Bac Pro MVA..."
              />
              <FieldHint>Séparez les formations par des virgules.</FieldHint>
            </div>

            <div>
              <Label htmlFor="company-notes">Notes internes</Label>
              <Textarea id="company-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
            </div>

            {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || !siretValid}>
                {submitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
