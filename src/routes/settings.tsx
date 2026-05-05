import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Sparkles, Shield, FileText } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { establishments, ESTABLISHMENT_ID } from '@/data/demo'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const est = establishments.find((e) => e.id === ESTABLISHMENT_ID)!
  const [name, setName] = useState(est.name)
  const [city, setCity] = useState(est.city)
  const [year, setYear] = useState('2025-2026')
  const [threshold, setThreshold] = useState(6)
  const [aiEnabled, setAiEnabled] = useState(true)

  return (
    <AppLayout title="Paramètres établissement" subtitle="Configuration générale et préférences IA">
      <RoleGuard allow={['admin', 'ddfpt']}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<Building2 className="w-4 h-4" />}>Identité de l'établissement</CardTitle>
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
                <Label>Année scolaire</Label>
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
                <Label>Seuil d'alerte (élèves par référent)</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Une alerte est levée dès qu'un professeur dépasse ce nombre d'élèves affectés.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<Sparkles className="w-4 h-4" />}>Préférences IA</CardTitle>
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
                    Reformulation des comptes rendus, résumés et alertes intelligentes.
                  </span>
                </span>
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">
                Toutes les générations IA sont journalisées dans `ai_interactions` et
                `audit_logs`. Aucune donnée d'un autre établissement n'est jamais exposée.
              </p>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle icon={<FileText className="w-4 h-4" />}>Modèles de documents et RGPD</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <Label>Mention RGPD affichée aux tuteurs</Label>
                <Textarea
                  defaultValue="Les informations recueillies sont traitées par le lycée à des fins exclusivement pédagogiques. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression."
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Modèles de convention, attestation et fiche de visite : interface d'édition prévue
                en phase suivante (rédaction WYSIWYG + variables élève / entreprise / période).
              </p>
            </CardBody>
          </Card>
        </div>
      </RoleGuard>
    </AppLayout>
  )
}
