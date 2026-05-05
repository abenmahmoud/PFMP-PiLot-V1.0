import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { AiAssistantPanel } from '@/components/AiAssistantPanel'

export const Route = createFileRoute('/superadmin/ai')({ component: SuperadminAiPage })

function SuperadminAiPage() {
  return (
    <AppLayout
      title="Assistant IA Superadmin"
      subtitle="Analyse usage, détection des risques, support client"
    >
      <RoleGuard allow={['superadmin']}>
        <AiAssistantPanel
          type="superadmin"
          title="Assistant IA Superadmin"
          description="L'IA n'invente pas. Elle propose un brouillon que vous validez avant tout envoi externe."
          examples={[
            'Résume-moi l\'activité du Lycée Voltaire',
            'Quels établissements sont peu actifs ?',
            'Quels clients risquent d\'abandonner ?',
            'Génère un message de relance professionnel',
            'Prépare un rapport hebdomadaire',
          ]}
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Toutes les générations IA sont enregistrées dans `ai_interactions` et `audit_logs`,
          avec l'utilisateur, l'établissement concerné et un résumé de la requête.
        </p>
      </RoleGuard>
    </AppLayout>
  )
}
