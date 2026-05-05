import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Sparkles } from 'lucide-react'

export const Route = createFileRoute('/superadmin/ai')({ component: SuperadminAiPage })

function SuperadminAiPage() {
  return (
    <AppLayout
      title="Assistant IA Superadmin"
      subtitle="Analyse usage, intelligence réseau, support client"
    >
      <RoleGuard allow={['superadmin']}>
        <AiAssistantPanel
          type="superadmin"
          title="Assistant IA Superadmin"
          description="L'IA n'invente pas. Elle propose un brouillon que vous validez avant tout envoi externe."
          examples={[
            'Quels établissements dois-je accompagner ?',
            'Quels établissements ont une base entreprises faible ?',
            'Quels secteurs sont les plus représentés ?',
            'Prépare une relance pour un établissement peu actif',
            'Résume-moi l\'activité du Lycée Voltaire',
            'Prépare un rapport hebdomadaire',
          ]}
        />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle icon={<Sparkles className="w-4 h-4" />}>
              Ce que l'assistant peut faire
            </CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2 text-[var(--color-text-muted)]">
            <p>
              · <strong>Lecture transverse</strong> : repère les établissements à faible
              activité ou avec une base entreprises sous-dimensionnée.
            </p>
            <p>
              · <strong>Cartographie réseau</strong> : agrège secteurs et familles de
              métiers pour détecter les zones blanches.
            </p>
            <p>
              · <strong>Brouillon de relance</strong> : produit un message professionnel
              prêt à reprendre, jamais envoyé directement.
            </p>
            <p>
              · <strong>Aucune décision automatisée</strong> : toute action client
              nécessite la validation humaine du superadmin.
            </p>
          </CardBody>
        </Card>

        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Toutes les générations IA seront enregistrées dans `ai_interactions` et
          `audit_logs` (utilisateur, établissement concerné, résumé de la requête)
          quand Supabase sera branché. TODO — connecter à une Edge Function avec clé
          serveur.
        </p>
      </RoleGuard>
    </AppLayout>
  )
}
